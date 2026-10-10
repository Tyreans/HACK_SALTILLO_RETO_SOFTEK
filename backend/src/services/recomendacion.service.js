import * as Candidatos from "../models/candidatos.model.js";
import * as Dashboard from "../models/dashboard.model.js";
import * as Tienda from "../models/tienda.model.js";
import * as Venta from "../models/venta.model.js";
import * as Rec from "../models/recomendacion.model.js";
import { periodo } from "./dashboard.service.js";
import * as Memoria from "./memoria.service.js";
import { generar } from "./gemini.service.js";
import { ApiError } from "../utils/apiError.js";
import { query } from "../config/db.config.js";

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
    tipo: "reposicion", sku: c.sku, producto: c.producto, cantidad, existencia: c.existencia,
    prioridad: dias <= c.entrega ? "alta" : dias <= c.entrega + 2 ? "media" : "baja",
    orden: dias,
    hecho: `Quedan ${c.existencia} piezas (≈${dias.toFixed(1)} días). ` +
      `La proyección estima ${c.venta_diaria.toFixed(1)} piezas diarias para el horizonte del proveedor ` +
      `a partir de ${c.dias_historicos} días de historial` +
      `${c.venta_diaria_historica == null ? "" : ` (promedio histórico: ${Number(c.venta_diaria_historica).toFixed(1)})`}; ` +
      `la entrega tarda ${c.entrega} días.${calendario ? ` ${calendario}` : ""}`,
  };
}

function descuentoMaximo(precio, costo, permitirEquilibrio) {
  for (let descuento = 99; descuento >= 0; descuento -= 1) {
    const final = r2(precio * (1 - descuento / 100));
    if (permitirEquilibrio ? final >= costo : final > costo) return descuento;
  }
  return 0;
}

// La fase temprana conserva margen; la fase final puede liquidar a costo, nunca debajo.
function promocion(c) {
  const dias = Number(c.dias_retiro);
  const existencia = Number(c.existencia);
  const sobrante = Number(c.sobrante_proyectado);
  const precio = Number(c.precio);
  const costo = Number(c.costo);
  if (![dias, existencia, sobrante, precio, costo].every(Number.isFinite)
      || dias < 1 || existencia < 1 || sobrante < 1 || precio <= costo || costo <= 0) return null;

  const promoActivaId = c.promocion_activa_id;
  const promoActivaRelacionada = c.promocion_activa_recomendacion_id != null;
  let descuento;
  let escalar = false;

  if (dias > 7) {
    if (promoActivaId) return null;
    const proporcionSobrante = sobrante / existencia;
    const objetivo = proporcionSobrante >= 0.66 ? 30 : proporcionSobrante >= 0.33 ? 20 : 10;
    const maximoConMargen = descuentoMaximo(precio, costo, false);
    descuento = [30, 20, 10].find((nivel) => nivel <= objetivo && nivel <= maximoConMargen);
    if (!descuento || descuento < 1) return null;
  } else if (promoActivaId && promoActivaRelacionada) {
    const descuentoActual = Number(c.descuento_activo || 0);
    const maximoConMargen = descuentoMaximo(precio, costo, false);
    const siguienteNivel = [10, 20, 30].find((nivel) => nivel > descuentoActual && nivel <= maximoConMargen);
    descuento = siguienteNivel ?? descuentoMaximo(precio, costo, true);
    if (descuento <= Number(c.descuento_activo || 0)) return null;
    escalar = true;
  } else if (promoActivaId) {
    return null;
  } else {
    const objetivo = 30;
    const maximoConMargen = descuentoMaximo(precio, costo, false);
    descuento = [30, 20, 10].find((nivel) => nivel <= objetivo && nivel <= maximoConMargen);
    if (!descuento || descuento < 1) return null;
  }

  const fecha_inicio = c.fecha_calculo;
  const fecha_fin = sumarDias(c.fecha_retiro, -1);
  const precioPromocional = r2(precio * (1 - descuento / 100));
  const breakEven = Math.abs(precioPromocional - costo) < 0.005;
  const faltantesCalendario = Number(c.dias_calendario_futuro) < Number(c.dias_futuros);
  const razonEscala = escalar
    ? `La promoción vigente es ${Number(c.descuento_activo)}%; quedan ${dias} días y se proyecta inventario sin vender.`
    : `${dias} días para retirar el producto; se proyectan ${sobrante} unidades sin vender de ${existencia}.`;

  return {
    tipo: "promocion",
    sku: c.sku,
    producto: c.producto,
    descuento_pct: descuento,
    existencia,
    sobrante_proyectado: sobrante,
    precio_actual: precio,
    precio_propuesto: precioPromocional,
    prioridad: dias <= 7 || sobrante / existencia >= 0.66 ? "alta" : "media",
    orden: dias - sobrante / existencia,
    hecho: `${razonEscala} Precio regular $${precio.toFixed(2)}, promoción $${precioPromocional.toFixed(2)} ` +
      `(costo $${costo.toFixed(2)}${breakEven ? ", punto de equilibrio" : ", conserva margen"}). ` +
      `Inventario registrado el ${c.fecha_inventario}; la promoción termina ${fecha_fin}.` +
      (faltantesCalendario ? ` Calendario futuro incompleto (${c.dias_calendario_futuro}/${c.dias_futuros} días); se usan patrones históricos disponibles.` : ""),
    fecha_inicio,
    fecha_fin,
    actualizar_promo_id: escalar ? promoActivaId : null,
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
  const excluidos = await Rec.skusExcluidos(tienda, tipo);

  let items;
  if (tipo === "reposicion") {
    const factores = await Rec.factoresAprendidos(tienda, tipo);
    const hasta = await Candidatos.ultimaFechaInventario(tienda);
    if (!hasta) throw new ApiError(409, `La tienda ${tienda} no tiene historial de inventario para generar reposición`);
    items = (await Candidatos.reposicion(tienda, hasta)).map((c) => reposicion(c, enRango(factores.get(c.sku) ?? 1, 0.3, 1.5)));
  } else if (tipo === "promocion") {
    items = (await Candidatos.promocion(tienda)).map(promocion);
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

export async function generarRecomendacionesDiarias({ tienda } = {}) {
  const ordenesExportadas = await Rec.exportarOrdenesPendientes();
  const tiendas = tienda ? [{ store_id: tienda }] : await Tienda.paraReposicion();
  const resultados = [];
  const errores = [];

  for (const actual of tiendas) {
    for (const tipo of ["reposicion", "promocion"]) {
      try {
        const recomendaciones = await obtener({ tienda: actual.store_id, tipo, regenerar: true });
        resultados.push({ tienda: actual.store_id, tipo, recomendaciones: recomendaciones.length });
      } catch (error) {
        errores.push({ tienda: actual.store_id, tipo, mensaje: error.message });
        console.error(`No se pudo generar ${tipo} para ${actual.store_id}:`, error.message);
      }
    }
  }
  return { ordenesExportadas, procesadas: resultados, errores };
}

export const generarReposicionDiaria = generarRecomendacionesDiarias;

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
    if (!Number.isFinite(producto.precio) || !Number.isFinite(producto.costo)
        || producto.precio <= producto.costo || producto.costo <= 0) {
      throw new ApiError(409, "No se puede proponer una promoción sin precio vigente y costo unitario válido");
    }
    const { rows } = await query(
      "SELECT discontinued_date::text AS fecha_retiro FROM products WHERE sku = $1",
      [sku]
    );
    if (!rows[0]?.fecha_retiro || rows[0].fecha_retiro <= hoy()) {
      throw new ApiError(409, "El producto no tiene una fecha futura de retiro para validar el descuento");
    }
    if (fecha_inicio >= rows[0].fecha_retiro) {
      throw new ApiError(400, "La promoción debe iniciar antes de la fecha de retiro del producto");
    }
    const diasParaRetiro = Math.floor((Date.parse(`${rows[0].fecha_retiro}T00:00:00Z`) - Date.parse(`${fecha_inicio}T00:00:00Z`)) / 86_400_000);
    const maximo = descuentoMaximo(producto.precio, producto.costo, diasParaRetiro <= 7);
    if (descuento_pct > maximo) {
      throw new ApiError(400, `El descuento máximo permitido hoy es ${maximo}% para respetar el costo y la fecha de retiro`);
    }
    const ultimoDiaPromo = sumarDias(rows[0].fecha_retiro, -1);
    fecha_fin ??= ultimoDiaPromo;
    if (fecha_fin < fecha_inicio) throw new ApiError(400, "fecha_fin no puede ser anterior a fecha_inicio");
    if (fecha_fin > ultimoDiaPromo) {
      throw new ApiError(400, "La promoción debe terminar antes de la fecha de retiro del producto");
    }
  }
  return Rec.crearManual({ tienda, tipo, producto, cantidad, descuento_pct, precio, motivo, fecha_inicio, fecha_fin });
}
