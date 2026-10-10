import * as Candidatos from "../models/candidatos.model.js";
import * as Dashboard from "../models/dashboard.model.js";
import * as Tienda from "../models/tienda.model.js";
import * as Venta from "../models/venta.model.js";
import * as Rec from "../models/recomendacion.model.js";
import { periodo } from "./dashboard.service.js";
import * as Memoria from "./memoria.service.js";
import { generar } from "./gemini.service.js";
import { ApiError } from "../utils/apiError.js";

const MAX_FILAS = 8;
const hoy = () => new Date().toISOString().slice(0, 10);
const sumarDias = (f, d) => {
  const x = new Date(f + "T00:00:00Z");
  x.setUTCDate(x.getUTCDate() + d);
  return x.toISOString().slice(0, 10);
};
const r2 = (n) => Math.round(n * 100) / 100;
const enRango = (n, min, max) => Math.min(Math.max(n, min), max);

// ------------------------------------------------------------------ reglas por tipo

// Re-stock: cubrir (entrega del proveedor + días de colchón) con 20 % de seguridad,
// restando lo que hay y lo que ya viene en camino; se pide en cajas completas.
function reposicion(c, factor = 1) {
  const colchon = c.perecedero ? 1 : 3;
  const objetivo = c.venta_diaria * (c.entrega + colchon) * 1.2;
  const faltante = objetivo - c.existencia - c.en_camino;
  if (faltante <= 0) return null;

  let cantidad = Math.ceil(faltante / c.caja) * c.caja;
  if (c.perecedero) {
    // no pedir más de lo que se alcanza a vender antes de que caduque
    const tope = Math.floor((c.venta_diaria * c.vida_util) / c.caja) * c.caja;
    if (tope < c.caja) return null;
    cantidad = Math.min(cantidad, tope);
  }
  cantidad = Math.max(c.caja, Math.round((cantidad * factor) / c.caja) * c.caja);

  const dias = c.existencia / c.venta_diaria;
  const eventos = Array.isArray(c.eventos_calendario) ? c.eventos_calendario : [];
  const eventosTexto = eventos.slice(0, 3).map((e) => {
    if (e.festivo) return `festivo ${e.festivo} (${e.fecha})`;
    if (e.vacaciones_escolares) return `vacaciones escolares (${e.fecha})`;
    return `fin de semana (${e.fecha})`;
  });
  const calendario = [
    eventosTexto.length ? `Calendario próximo: ${eventosTexto.join(", ")}.` : "",
    c.dias_calendario < c.dias_pronosticados
      ? `Calendario incompleto (${c.dias_calendario}/${c.dias_pronosticados} días); para fechas faltantes se usa el promedio histórico.`
      : "",
  ].filter(Boolean).join(" ");
  return {
    tipo: "reposicion", sku: c.sku, producto: c.producto, cantidad,
    prioridad: dias <= c.entrega ? "alta" : dias <= c.entrega + 2 ? "media" : "baja",
    orden: dias,
    hecho: `Quedan ${c.existencia} piezas (≈${dias.toFixed(1)} días). ` +
      `La proyección estima ${c.venta_diaria.toFixed(1)} piezas diarias para el horizonte del proveedor ` +
      `a partir de ${c.dias_historicos} días de historial` +
      `${c.venta_diaria_historica == null ? "" : ` (promedio histórico: ${Number(c.venta_diaria_historica).toFixed(1)})`}; ` +
      `la entrega tarda ${c.entrega} días.${calendario ? ` ${calendario}` : ""}`,
  };
}

// Promoción: merma por caducidad o inventario para muchos días. Nunca bajo costo + 5 %.
function promocion(c, factor = 1) {
  const vd = Math.max(c.venta_diaria, 0.01);
  const merma = c.caducado / Math.max(c.vendido + c.caducado, 1);
  const cobertura = c.existencia / vd;

  let descuento, prioridad, hecho;
  if (c.perecedero && (merma >= 0.1 || c.existencia >= vd * c.vida_util * 0.7)) {
    descuento = merma >= 0.25 ? 30 : 20;
    prioridad = merma >= 0.25 ? "alta" : "media";
    hecho = merma >= 0.1
      ? `Se caducó el ${Math.round(merma * 100)} % de lo disponible esta semana y quedan ${c.existencia} piezas.`
      : `Hay ${c.existencia} piezas y su vida útil es de ${c.vida_util} días.`;
  } else if (cobertura >= 10) {
    descuento = cobertura >= 21 ? 15 : 10;
    prioridad = "baja";
    hecho = `Hay inventario para ${Math.round(cobertura)} días y vende ${c.venta_diaria.toFixed(1)} al día.`;
  } else return null;

  const techo = Math.floor((1 - (c.costo * 1.05) / c.precio) * 100);
  descuento = Math.min(Math.round(descuento * factor), techo);
  descuento = Math.min(Math.max(descuento, 5), techo);
  if (techo < 5) return null;

  // Vigencia: los perecederos rotan rápido (3 días); el resto, una semana
  const fecha_inicio = hoy();
  const fecha_fin = sumarDias(fecha_inicio, c.perecedero ? 2 : 6);
  return {
    tipo: "promocion", sku: c.sku, producto: c.producto, descuento_pct: descuento,
    precio_actual: c.precio, prioridad, orden: -descuento, hecho, fecha_inicio, fecha_fin,
  };
}

// Precio: acercarse al promedio de la competencia; subir si estamos muy abajo y el producto se vende
function precio(c) {
  const brecha = (c.precio - c.promedio) / c.promedio;
  const donde = c.alcance !== "sitio" ? "la competencia"
    : c.competidores === 1 ? "el rival de este sitio" : `los ${c.competidores} rivales de este sitio`;
  const nota = c.rival_en_promocion ? " Ojo: un rival tiene oferta temporal." : "";
  let propuesto, hecho;
  if (brecha > 0.05) {
    propuesto = r2(Math.max(c.promedio, c.costo * 1.15));
    const contra = c.alcance === "sitio" && c.competidores === 1 ? donde : `el promedio de ${donde}`;
    hecho = `Cuesta ${Math.round(brecha * 100)} % más que ${contra} ($${r2(c.promedio)}).${nota}`;
  } else if (brecha < -0.1 && c.unidades > 0) {
    propuesto = r2(c.promedio * 0.97);
    hecho = `Cuesta ${Math.round(-brecha * 100)} % menos que ${donde} ($${r2(c.promedio)}) y se vende: hay margen para subir.${nota}`;
  } else return null;
  if (propuesto === c.precio) return null;
  const abs = Math.abs(brecha);
  return {
    tipo: "precio", sku: c.sku, producto: c.producto, precio_actual: c.precio, precio_propuesto: propuesto,
    prioridad: abs >= 0.15 ? "alta" : abs >= 0.08 ? "media" : "baja", orden: -abs, hecho,
  };
}

// Sin datos de competencia: bajar 10 % al peor vendedor, sin pasar de costo + 10 %
async function precioSinCompetencia(tienda) {
  const p = await periodo({ dias: 7 });
  const peores = await Dashboard.productosPorVenta({ tienda, ...p, limite: 3, orden: "ASC" });
  const items = [];
  for (const x of peores) {
    const prod = await Candidatos.producto(tienda, x.sku);
    if (!prod?.precio) continue;
    const propuesto = r2(Math.max(prod.precio * 0.9, prod.costo * 1.1));
    if (propuesto >= prod.precio) continue;
    items.push({
      tipo: "precio", sku: x.sku, producto: prod.producto, precio_actual: prod.precio,
      precio_propuesto: propuesto, prioridad: "baja", orden: 0,
      hecho: "Es de los que menos se venden y aún no hay precios de la competencia: se propone una baja del 10 %.",
    });
  }
  return items;
}

// ------------------------------------------------------------------ redacción con Gemini

// Gemini solo redacta el motivo; los productos y cifras salen de la base de datos.
// Si falla o contesta algo raro, se usa el texto de la regla.
async function redactar(items, tipo, tienda) {
  if (!items.length) return items;
  const base = items.map((i) => ({ ...i, descripcion: i.hecho }));
  let memoria = "";
  try {
    memoria = await Memoria.contexto({ tienda, tipo });
  } catch (e) {
    console.warn(`Backboard no pudo aportar memoria (${tienda}/${tipo}); sigo con los datos actuales:`, e.message);
  }
  try {
    const out = await generar({
      json: true,
      sistema: "Eres analista de una tienda en aeropuerto. Respondes en español, breve y sin inventar datos. Conserva las cifras y eventos de calendario proporcionados.",
      prompt:
        `Para cada fila escribe el motivo de la sugerencia en máximo 25 palabras, conservando cifras y eventos de calendario de "hecho".\n` +
        (memoria ? `Lo que ya sabes de este negocio:\n${memoria}\n` : "") +
        `Filas: ${JSON.stringify(items.map((i) => ({ sku: i.sku, producto: i.producto, hecho: i.hecho })))}\n` +
        `Devuelve un arreglo JSON: [{"sku":"...","motivo":"..."}]`,
    });
    const porSku = new Map((Array.isArray(out) ? out : []).map((o) => [o?.sku, o?.motivo]));
    for (const i of base) {
      const m = porSku.get(i.sku);
      if (typeof m === "string" && m.trim()) i.descripcion = m.trim().slice(0, 200);
    }
  } catch (e) {
    console.error(`Gemini falló (${tipo}), usando el texto de la regla:`, e.message);
  }
  return base;
}

// ------------------------------------------------------------------ generación

async function generarItems(tienda, tipo) {
  const [excluidos, factores] = await Promise.all([
    Rec.skusExcluidos(tienda, tipo),
    Rec.factoresAprendidos(tienda, tipo),
  ]);

  let items;
  if (tipo === "reposicion") {
    const hasta = await Candidatos.ultimaFechaInventario(tienda);
    if (!hasta) throw new ApiError(409, `La tienda ${tienda} no tiene historial de inventario para generar reposición`);
    items = (await Candidatos.reposicion(tienda, hasta)).map((c) => reposicion(c, enRango(factores.get(c.sku) ?? 1, 0.3, 1.5)));
  } else if (tipo === "promocion") {
    const { hasta } = await Venta.rangoFechas();
    items = (await Candidatos.promocion(tienda, hasta)).map((c) => promocion(c, enRango(factores.get(c.sku) ?? 1, 0.5, 1.5)));
  } else {
    const { hasta } = await Venta.rangoFechas();
    const filas = await Candidatos.precios(tienda, hasta);
    items = filas.length ? filas.map(precio) : await precioSinCompetencia(tienda);
  }

  items = items
    .filter((i) => i && !excluidos.has(i.sku))
    .sort((a, b) => a.orden - b.orden)
    .slice(0, MAX_FILAS);
  return redactar(items, tipo, tienda);
}

// Sin `tipo`: solo lo que ya existe hoy (barato, para los contadores de los botones).
// Con `tipo`: si hoy aún no se generó, se genera; después siempre devuelve lo guardado.
export async function obtener({ tienda, tipo, regenerar = false }) {
  if (!(await Tienda.obtener(tienda))) throw new ApiError(404, `La tienda ${tienda} no existe`);
  if (!tipo) return Rec.delDia(tienda);
  if (regenerar || !(await Rec.hayAgenteHoy(tienda, tipo))) {
    await Rec.reemplazarAgente(tienda, tipo, await generarItems(tienda, tipo), { regenerar });
  }
  return Rec.delDia(tienda, tipo);
}

export async function generarReposicionDiaria({ tienda } = {}) {
  const ordenesExportadas = await Rec.exportarOrdenesPendientes();
  const tiendas = tienda ? [{ store_id: tienda }] : await Tienda.paraReposicion();
  const resultados = [];
  const errores = [];

  for (const actual of tiendas) {
    try {
      const recomendaciones = await obtener({ tienda: actual.store_id, tipo: "reposicion", regenerar: true });
      resultados.push({ tienda: actual.store_id, recomendaciones: recomendaciones.length });
    } catch (error) {
      errores.push({ tienda: actual.store_id, mensaje: error.message });
      console.error(`No se pudo generar reposición para ${actual.store_id}:`, error.message);
    }
  }
  return { ordenesExportadas, procesadas: resultados, errores };
}

export async function crearManual({ tienda, tipo, sku, cantidad, descuento_pct, precio, motivo, fecha_inicio, fecha_fin }) {
  if (!(await Tienda.obtener(tienda))) throw new ApiError(404, `La tienda ${tienda} no existe`);
  const producto = await Candidatos.producto(tienda, sku);
  if (!producto) throw new ApiError(404, `El producto ${sku} no existe`);

  if (tipo === "reposicion" && cantidad == null) throw new ApiError(400, "Falta 'cantidad'");
  if (tipo === "promocion" && descuento_pct == null) throw new ApiError(400, "Falta 'descuento_pct'");
  if (tipo === "precio" && precio == null) throw new ApiError(400, "Falta 'precio'");
  if (tipo === "precio" && producto.precio == null) throw new ApiError(400, "Ese producto no tiene precio vigente en la tienda");
  const campos = { reposicion: ["cantidad"], promocion: ["descuento_pct", "fecha_inicio", "fecha_fin"], precio: ["precio"] }[tipo];
  const dado = { cantidad, descuento_pct, precio, fecha_inicio, fecha_fin };
  for (const k of Object.keys(dado)) {
    if (!campos.includes(k) && dado[k] != null) throw new ApiError(400, `Una recomendación de ${tipo} solo admite: ${campos.join(", ")}`);
  }
  if (tipo === "promocion") {
    fecha_inicio ??= hoy();
    fecha_fin ??= sumarDias(fecha_inicio, 6);
    if (fecha_fin < fecha_inicio) throw new ApiError(400, "fecha_fin no puede ser anterior a fecha_inicio");
  }
  return Rec.crearManual({ tienda, tipo, producto, cantidad, descuento_pct, precio, motivo, fecha_inicio, fecha_fin });
}
