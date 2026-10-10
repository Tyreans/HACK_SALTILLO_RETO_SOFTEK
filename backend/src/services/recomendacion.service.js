import * as Dashboard from "../models/dashboard.model.js";
import * as Tienda from "../models/tienda.model.js";
import * as Rec from "../models/recomendacion.model.js";
import { periodo } from "./dashboard.service.js";
import { generar } from "./gemini.service.js";
import { ApiError } from "../utils/apiError.js";

const PRIORIDADES = ["alta", "media", "baja"];

async function hechos(tienda) {
  const p = await periodo({ dias: 7 });
  const [inv, peores] = await Promise.all([
    Dashboard.inventarioCobertura({ tienda, desde: p.desde, hasta: p.hasta }),
    Dashboard.productosPorVenta({ tienda, ...p, limite: 3, orden: "ASC" }),
  ]);
  const bajos = inv.filter((i) => i.bajo).slice(0, 3);

  // Precio: se propone -15 % al peor vendedor, sin bajar de costo + 10 %
  let precio = null;
  if (peores[0]) {
    const v = await Rec.precioVigente(tienda, peores[0].sku);
    if (v) {
      const propuesto = Math.max(
        Math.round(v.unit_price * 0.85 * 100) / 100,
        Math.round((v.unit_cost ?? 0) * 1.1 * 100) / 100
      );
      if (propuesto < v.unit_price) {
        precio = { sku: peores[0].sku, producto: peores[0].producto, actual: v.unit_price, propuesto };
      }
    }
  }
  return { bajos, peores, precio };
}

// Texto de respaldo si Gemini falla o contesta mal (plan B para la demo)
function respaldo(h) {
  return {
    reposicion: { prioridad: "alta", descripcion: `Reponer ${h.bajos.map((b) => b.producto).join(" y ")} pronto.` },
    promocion: { prioridad: "media", descripcion: `Ofrecer descuento en ${h.peores.slice(0, 2).map((p) => p.producto).join(" y ")} para impulsar rotación.` },
    precio: { prioridad: "baja", descripcion: h.precio ? `Revisar precio de ${h.precio.producto} para mantener margen sin perder competitividad.` : "" },
  };
}

async function redactar(h) {
  const base = respaldo(h);
  try {
    const out = await generar({
      json: true,
      sistema: "Eres analista de una tienda en aeropuerto. Respondes en español, breve y sin inventar datos.",
      prompt:
        `Datos reales (no inventes productos ni cifras):\n${JSON.stringify(h)}\n\n` +
        `Devuelve un arreglo JSON con 3 objetos {"tipo":"reposicion"|"promocion"|"precio","prioridad":"alta"|"media"|"baja","descripcion":"máx 20 palabras"}. ` +
        `Reposición usa "bajos", promoción usa "peores", precio usa "precio".`,
    });
    for (const o of Array.isArray(out) ? out : []) {
      if (base[o?.tipo] && typeof o.descripcion === "string" && PRIORIDADES.includes(o.prioridad)) {
        base[o.tipo] = { prioridad: o.prioridad, descripcion: o.descripcion.slice(0, 200) };
      }
    }
  } catch (e) {
    console.error("Gemini falló, usando texto de respaldo:", e.message);
  }
  return base;
}

export async function obtenerOGenerar({ tienda, regenerar = false }) {
  if (!(await Tienda.obtener(tienda))) throw new ApiError(404, `La tienda ${tienda} no existe`);
  if (!regenerar) {
    const existentes = await Rec.delDia(tienda);
    if (existentes.length) return existentes; // evita gastar Gemini en cada recarga
  }
  const h = await hechos(tienda);
  const t = await redactar(h);
  const items = [];
  if (h.bajos.length) items.push({ tipo: "reposicion", titulo: "Reposición", ...t.reposicion });
  if (h.peores.length) items.push({ tipo: "promocion", titulo: "Promociones", ...t.promocion });
  if (h.precio) items.push({
    tipo: "precio", titulo: "Cambio de precios", ...t.precio,
    sku: h.precio.sku, precio_actual: h.precio.actual, precio_propuesto: h.precio.propuesto,
  });
  await Rec.borrarPendientes(tienda);
  await Rec.crear(tienda, items);
  return Rec.delDia(tienda);
}
