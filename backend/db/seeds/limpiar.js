// Limpieza del dataset de Otzo (antes "Glazed Co.").
// Lee los CSV originales de ./datos y deja versiones limpias en ./datos_limpios,
// más un reporte de calidad (reporte_calidad.md) y las filas descartadas (rechazos.csv).
//
// Uso (desde backend/):  npm run db:limpiar
// Pon los 14 CSV originales en backend/db/datos/. No necesita dependencias.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { leerCsv } from "./csv.js";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const ORIGEN = path.resolve(process.env.DATA_DIR || path.join(AQUI, "..", "datos"));
const DESTINO = path.join(AQUI, "..", "datos_limpios");
fs.mkdirSync(DESTINO, { recursive: true });

// ---------------------------------------------------------------- utilidades
const reporte = []; // { tabla, problema, filas, accion }
const rechazos = []; // { tabla, motivo, fila }
const anotar = (tabla, problema, filas, accion) => {
  if (filas > 0) reporte.push({ tabla, problema, filas, accion });
};
const rechazar = (tabla, motivo, fila) => rechazos.push({ tabla, motivo, fila: JSON.stringify(fila) });

const leer = (nombre) => leerCsv(path.join(ORIGEN, `${nombre}.csv`));
const num = (v) => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const redondear = (n, d = 2) => (n == null ? null : Math.round(n * 10 ** d) / 10 ** d);

const MESES = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const pad = (n) => String(n).padStart(2, "0");
// Acepta 2026-09-30, 09/30/2026 (MM/DD/YYYY) y 30-Sep-26
function fecha(v) {
  if (!v) return null;
  v = v.trim();
  let m;
  if ((m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/))) return v;
  if ((m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) return `${m[3]}-${pad(m[1])}-${pad(m[2])}`;
  if ((m = v.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/)) && MESES[m[2].toLowerCase()])
    return `20${m[3]}-${pad(MESES[m[2].toLowerCase()])}-${pad(m[1])}`;
  return null;
}
const sumarDias = (f, d) => {
  const x = new Date(f + "T00:00:00Z");
  x.setUTCDate(x.getUTCDate() + d);
  return x.toISOString().slice(0, 10);
};

// S7 / s007 / "S007 " / S0007  ->  S007
function tiendaId(v) {
  const m = String(v).trim().toUpperCase().match(/^S0*(\d{1,3})$/);
  return m ? "S" + m[1].padStart(3, "0") : String(v).trim().toUpperCase();
}
// sku-100131 / "SKU-100092 " / SKU100200  ->  SKU-100131
function skuId(v) {
  const m = String(v).trim().toUpperCase().match(/^SKU-?(\d+)$/);
  return m ? "SKU-" + m[1] : String(v).trim().toUpperCase();
}

function escribir(nombre, columnas, filas) {
  const esc = (v) => {
    if (v == null) return ""; // vacío = NULL al cargar
    const s = String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lineas = [columnas.join(",")];
  for (const f of filas) lineas.push(columnas.map((c) => esc(f[c])).join(","));
  fs.writeFileSync(path.join(DESTINO, `${nombre}.csv`), lineas.join("\n") + "\n");
  console.log(`  ${nombre}.csv: ${filas.length} filas`);
}

// Quita filas idénticas (todas las columnas iguales)
function sinDuplicadosExactos(tabla, filas) {
  const vistos = new Set();
  const out = filas.filter((f) => {
    const k = JSON.stringify(f);
    if (vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });
  anotar(tabla, "Filas duplicadas exactas", filas.length - out.length, "Eliminadas");
  return out;
}

console.log("Limpiando datos de", ORIGEN);

// ============================================================ sites
const sites = leer("sites").map((s) => ({ ...s, site_name: s.site_name.trim(), traffic_tier: num(s.traffic_tier) }));
const siteIds = new Set(sites.map((s) => s.site_id));

// ============================================================ suppliers
const suppliers = leer("suppliers");
const supplierIds = new Set(suppliers.map((s) => s.supplier_id));

// ============================================================ calendar
const calendar = leer("calendar").map((c) => ({ ...c, holiday_name: c.holiday_name || null }));
const fechasValidas = new Set(calendar.map((c) => c.date));

// ============================================================ stores
let stores = leer("stores");
{
  const tituloCase = (s) =>
    s.toLowerCase().replace(/(^|[\s(–-])([a-z])/g, (m, a, b) => a + b.toUpperCase()).replace(/Shop-In-Shop/g, "Shop-in-Shop");
  let nombres = 0, horas = 0;
  const vistos = new Map();
  const out = [];
  for (const s of stores) {
    if (!siteIds.has(s.site_id)) {
      anotar("stores", `Tienda ${s.store_id} apunta a un sitio inexistente (${s.site_id})`, 1, "Eliminada (no tiene ventas ni inventario)");
      rechazar("stores", "sitio inexistente", s);
      continue;
    }
    const limpio = tituloCase(s.store_name.replace(/\s+/g, " ").trim());
    if (limpio !== s.store_name) nombres++;
    s.store_name = limpio;
    const clave = `${s.site_id}|${limpio}|${s.opened_date}`;
    if (vistos.has(clave)) {
      anotar("stores", `Tienda ${s.store_id} duplica a ${vistos.get(clave)} (mismo sitio, nombre y apertura)`, 1, "Eliminada (no tiene ventas ni inventario)");
      rechazar("stores", "tienda duplicada", s);
      continue;
    }
    vistos.set(clave, s.store_id);
    for (const c of ["opening_time", "closing_time"]) {
      if (!/^\d{2}:\d{2}$/.test(s[c])) { s[c] = null; horas++; }
    }
    s.closed_date = s.closed_date || null;
    out.push(s);
  }
  anotar("stores", "Nombres con mayúsculas/espacios inconsistentes", nombres, "Normalizados");
  anotar("stores", "Horario de apertura vacío o '#N/A'", horas, "Dejado en NULL");
  stores = out;
}
const tiendaPorId = new Map(stores.map((s) => [s.store_id, s]));

// ============================================================ store_closures
const closures = leer("store_closures");
const enCierre = (storeId, f) => {
  const t = tiendaPorId.get(storeId);
  if (t && f < t.opened_date) return "venta antes de la apertura";
  if (t && t.closed_date && f > t.closed_date) return "venta después del cierre definitivo";
  for (const c of closures) {
    if (c.store_id === storeId && f >= c.start_date && f <= c.end_date && c.reason !== "Permanent closure")
      return `venta durante cierre temporal (${c.reason})`;
  }
  return null;
};

// ============================================================ products
let products = leer("products");
{
  // Categorías con mayúsculas distintas -> la forma más común
  const conteo = {};
  for (const p of products) {
    const k = p.category.trim().toLowerCase();
    conteo[k] = conteo[k] || {};
    conteo[k][p.category.trim()] = (conteo[k][p.category.trim()] || 0) + 1;
  }
  const canon = {};
  for (const [k, v] of Object.entries(conteo)) canon[k] = Object.entries(v).sort((a, b) => b[1] - a[1])[0][0];
  for (const k in canon) {
    // Si la única forma está toda en mayúsculas, se pasa a Título
    if (canon[k] === canon[k].toUpperCase()) canon[k] = k.replace(/(^|[\s-])([a-z])/g, (m, a, b) => a + b.toUpperCase());
  }
  canon["bakery goods"] = "Bakery";
  let cats = 0;
  for (const p of products) {
    const nueva = canon[p.category.trim().toLowerCase()];
    if (nueva !== p.category) { p.category = nueva; cats++; }
  }
  anotar("products", "Categorías escritas distinto (BAKERY, bakery, Bakery Goods…)", cats, "Unificadas a una sola forma");

  // SKUs repetidos: nos quedamos con la fila más completa
  const porSku = new Map();
  for (const p of products) {
    p.sku = skuId(p.sku);
    const llenos = Object.values(p).filter((v) => v !== "").length;
    const previo = porSku.get(p.sku);
    if (!previo) porSku.set(p.sku, p);
    else {
      rechazar("products", "SKU duplicado", llenos > Object.values(previo).filter((v) => v !== "").length ? previo : p);
      if (llenos > Object.values(previo).filter((v) => v !== "").length) porSku.set(p.sku, p);
    }
  }
  anotar("products", "SKUs repetidos", products.length - porSku.size, "Se conservó la fila más completa");
  products = [...porSku.values()];

  let vida = 0, costo = 0, precio = 0, fechasInv = 0;
  for (const p of products) {
    p.unit_cost = num(p.unit_cost);
    p.list_price_base = num(p.list_price_base);
    p.shelf_life_days = num(p.shelf_life_days);
    if (p.shelf_life_days != null && p.shelf_life_days <= 0) { p.shelf_life_days = null; vida++; }
    if (p.unit_cost === 0 || p.unit_cost == null) { costo++; p.unit_cost = null; }
    if (p.list_price_base === 0) { p.list_price_base = null; precio++; }
    p.discontinued_date = p.discontinued_date || null;
    if (p.discontinued_date && p.discontinued_date < p.launch_date) fechasInv++;
    p.en_catalogo = true;
  }
  anotar("products", "Vida útil 0 o negativa", vida, "Dejada en NULL");
  anotar("products", "Costo unitario vacío o en 0", costo, "Dejado en NULL");
  anotar("products", "Precio base en 0", precio, "Dejado en NULL");
  anotar("products", "Fecha de descontinuación anterior al lanzamiento", fechasInv, "Se conserva; marcar al analizar");
}
const productoPorSku = new Map(products.map((p) => [p.sku, p]));
const skusFaltantes = new Map(); // sku -> tablas donde aparece
const asegurarSku = (sku, tabla) => {
  if (productoPorSku.has(sku)) return;
  if (!skusFaltantes.has(sku)) skusFaltantes.set(sku, new Set());
  skusFaltantes.get(sku).add(tabla);
};

// ============================================================ promotions
const promotions = leer("promotions").map((p) => ({ ...p, category: p.category || null }));

// ============================================================ sales_daily
let sales = leer("sales_daily");
{
  sales = sinDuplicadosExactos("sales_daily", sales);
  let fechasArr = 0, tiendasArr = 0, skusArr = 0, unidades = 0, unidadesVacias = 0, netos = 0, promoInv = 0, precios = 0;
  const out = [];
  for (const s of sales) {
    const f = fecha(s.date);
    if (f !== s.date) fechasArr++;
    const st = tiendaId(s.store_id);
    if (st !== s.store_id) tiendasArr++;
    const sku = skuId(s.sku);
    if (sku !== s.sku) skusArr++;
    const r = { date: f, store_id: st, sku, units_sold: num(s.units_sold), unit_price: num(s.unit_price),
      gross_sales: num(s.gross_sales), discount_amount: num(s.discount_amount) ?? 0, net_sales: num(s.net_sales), promo_id: s.promo_id || null };

    if (!f || !fechasValidas.has(f)) { rechazar("sales_daily", "fecha inválida o fuera del periodo", s); continue; }
    if (!tiendaPorId.has(st)) { rechazar("sales_daily", "tienda inexistente", s); continue; }
    const motivoCierre = enCierre(st, f);
    if (motivoCierre) { rechazar("sales_daily", motivoCierre, s); continue; }
    if (r.gross_sales < 0 || (r.units_sold != null && r.units_sold < 0)) { rechazar("sales_daily", "unidades/ventas negativas", s); continue; }

    // Unidades vacías o 10x: se recalculan con venta bruta / precio
    const deducidas = r.unit_price ? Math.round(r.gross_sales / r.unit_price) : null;
    const cuadraDeducido = deducidas != null && Math.abs(deducidas * r.unit_price - r.gross_sales) < 0.02;
    if (r.units_sold == null) {
      if (!cuadraDeducido) { rechazar("sales_daily", "unidades vacías sin poder deducirlas", s); continue; }
      r.units_sold = deducidas; unidadesVacias++;
    } else if (Math.abs(r.units_sold * r.unit_price - r.gross_sales) > 0.02 && cuadraDeducido && deducidas !== r.units_sold) {
      r.units_sold = deducidas; unidades++;
    } else if (r.units_sold > 0 && Math.abs(r.units_sold * r.unit_price - r.gross_sales) > 0.02) {
      // Las unidades cuadran con lo demás pero el precio no: se confía en la venta bruta
      r.unit_price = redondear(r.gross_sales / r.units_sold); precios++;
    }

    // Venta neta debe ser bruta - descuento
    if (Math.abs(r.gross_sales - r.discount_amount - r.net_sales) > 0.02) {
      netos++;
      if (r.discount_amount > r.gross_sales || r.net_sales > r.gross_sales) {
        r.discount_amount = r.net_sales <= r.gross_sales ? redondear(r.gross_sales - r.net_sales) : 0;
      }
      r.net_sales = redondear(r.gross_sales - r.discount_amount);
    }
    if (r.promo_id && !promotions.some((p) => p.promo_id === r.promo_id)) { r.promo_id = null; promoInv++; }
    asegurarSku(sku, "sales_daily");
    out.push(r);
  }
  anotar("sales_daily", "Fechas en otros formatos (MM/DD/YYYY, DD-Mon-YY)", fechasArr, "Convertidas a YYYY-MM-DD");
  anotar("sales_daily", "IDs de tienda mal escritos (s013, 'S007 ', S0032)", tiendasArr, "Normalizados a S###");
  anotar("sales_daily", "SKUs mal escritos (minúsculas, espacios, sin guion)", skusArr, "Normalizados a SKU-######");
  anotar("sales_daily", "Unidades vacías", unidadesVacias, "Calculadas como venta bruta / precio");
  anotar("sales_daily", "Unidades que no cuadran con venta bruta / precio (p. ej. 10x)", unidades, "Recalculadas");
  anotar("sales_daily", "Precio unitario × unidades ≠ venta bruta", precios, "Precio recalculado como venta bruta / unidades");
  anotar("sales_daily", "Venta neta ≠ bruta − descuento", netos, "Recalculada");
  anotar("sales_daily", "Promoción inexistente (PR999)", promoInv, "Promo dejada en NULL");

  // Si tras normalizar quedan varias filas con la misma llave, se suman
  const porLlave = new Map();
  for (const r of out) {
    const k = `${r.date}|${r.store_id}|${r.sku}`;
    const p = porLlave.get(k);
    if (!p) porLlave.set(k, r);
    else {
      p.units_sold += r.units_sold; p.gross_sales = redondear(p.gross_sales + r.gross_sales);
      p.discount_amount = redondear(p.discount_amount + r.discount_amount); p.net_sales = redondear(p.net_sales + r.net_sales);
      p.promo_id = p.promo_id || r.promo_id;
    }
  }
  anotar("sales_daily", "Misma tienda/SKU/día repetida tras normalizar IDs", out.length - porLlave.size, "Sumadas en una sola fila");
  sales = [...porLlave.values()];
}

// PR003 termina antes de empezar; las ventas muestran que duró hasta el 24 de dic
for (const p of promotions) {
  if (p.end_date < p.start_date) {
    const usos = sales.filter((s) => s.promo_id === p.promo_id).map((s) => s.date).sort();
    const fin = usos.length ? usos[usos.length - 1] : p.start_date;
    anotar("promotions", `${p.promo_id} termina (${p.end_date}) antes de empezar (${p.start_date})`, 1, `Fin corregido a ${fin} según las ventas`);
    p.end_date = fin;
  }
}
anotar("promotions", "PR013 'Mystery Promo' no aparece en ninguna venta", promotions.some((p) => p.promo_id === "PR013") && !sales.some((s) => s.promo_id === "PR013") ? 1 : 0, "Se conserva, sin efecto en ventas");

// ============================================================ inventory_daily
let inventory = leer("inventory_daily");
{
  inventory = sinDuplicadosExactos("inventory_daily", inventory);
  let skus = 0, ecuacion = 0, negativos = 0, horas = 0;
  const vistos = new Set();
  const out = [];
  for (const i of inventory) {
    const sku = skuId(i.sku);
    if (sku !== i.sku) skus++;
    const r = { date: fecha(i.date), store_id: tiendaId(i.store_id), sku };
    for (const c of ["opening_qty", "received_qty", "units_sold", "expired_qty", "damaged_qty", "closing_qty", "on_order_qty", "stockout_hours"]) r[c] = num(i[c]) ?? 0;
    if (!tiendaPorId.has(r.store_id)) { rechazar("inventory_daily", "tienda inexistente", i); continue; }
    const k = `${r.date}|${r.store_id}|${r.sku}`;
    if (vistos.has(k)) { rechazar("inventory_daily", "llave repetida", i); continue; }
    vistos.add(k);

    const calculado = r.opening_qty + r.received_qty - r.units_sold - r.expired_qty - r.damaged_qty;
    if (calculado !== r.closing_qty) ecuacion++;
    if (calculado < 0) negativos++;
    r.closing_qty = Math.max(0, calculado);
    if (r.stockout_hours > 24) { r.stockout_hours = 24; horas++; }
    asegurarSku(sku, "inventory_daily");
    out.push(r);
  }
  anotar("inventory_daily", "SKUs en minúsculas", skus, "Normalizados");
  anotar("inventory_daily", "Cierre ≠ inicial + recibido − vendido − caducado − dañado", ecuacion, "Cierre recalculado con la fórmula");
  anotar("inventory_daily", "Inventario de cierre negativo", negativos, "Ajustado a 0");
  anotar("inventory_daily", "Más de 24 horas sin stock en un día", horas, "Limitado a 24");
  inventory = out;
}

// ============================================================ purchase_orders
let orders = leer("purchase_orders");
{
  // po_id repetido: se prefiere la fila coherente (recibido ≤ ordenado)
  const porId = new Map();
  let repetidos = 0;
  for (const o of orders) {
    const previo = porId.get(o.po_id);
    if (!previo) { porId.set(o.po_id, o); continue; }
    repetidos++;
    const coherente = (x) => num(x.qty_received) == null || num(x.qty_received) === num(x.qty_ordered);
    if (!coherente(previo) && coherente(o)) { rechazar("purchase_orders", "po_id repetido", previo); porId.set(o.po_id, o); }
    else rechazar("purchase_orders", "po_id repetido", o);
  }
  anotar("purchase_orders", "po_id repetido con cantidades distintas", repetidos, "Se conservó la fila coherente");

  let prov = 0, neg = 0, costo = 0, status = 0, sinFecha = 0, antes = 0, exceso = 0;
  const out = [];
  for (const o of porId.values()) {
    const p = productoPorSku.get(skuId(o.sku));
    const r = {
      po_id: o.po_id, store_id: tiendaId(o.store_id), supplier_id: o.supplier_id, sku: skuId(o.sku),
      order_date: fecha(o.order_date), expected_date: fecha(o.expected_date), received_date: fecha(o.received_date),
      qty_ordered: num(o.qty_ordered), qty_received: num(o.qty_received), unit_cost: num(o.unit_cost), status: o.status,
    };
    if (!tiendaPorId.has(r.store_id)) { rechazar("purchase_orders", "tienda inexistente", o); continue; }
    if (!supplierIds.has(r.supplier_id)) { r.supplier_id = p?.supplier_id ?? null; prov++; }
    if (r.qty_ordered < 0) { r.qty_ordered = Math.abs(r.qty_ordered); neg++; }
    if (r.unit_cost == null || r.unit_cost <= 0) { r.unit_cost = p?.unit_cost ?? null; costo++; }
    if (r.status === "Delivered" && !r.received_date) { r.received_date = r.expected_date; sinFecha++; }
    if (r.received_date && r.received_date < r.order_date) { r.received_date = r.expected_date; antes++; }
    if (r.qty_received != null && r.qty_received > r.qty_ordered) exceso++;
    if (r.status === "Delivered" && r.qty_received != null && r.qty_received < r.qty_ordered) { r.status = "Short-shipped"; status++; }
    asegurarSku(r.sku, "purchase_orders");
    out.push(r);
  }
  anotar("purchase_orders", "Proveedor inexistente (SUP99)", prov, "Reemplazado por el proveedor del producto");
  anotar("purchase_orders", "Cantidad ordenada negativa", neg, "Convertida a positiva");
  anotar("purchase_orders", "Costo unitario vacío o negativo", costo, "Tomado del catálogo de productos");
  anotar("purchase_orders", "'Delivered' sin fecha de recepción", sinFecha, "Se usó la fecha esperada");
  anotar("purchase_orders", "Recibida antes de ordenarse", antes, "Se usó la fecha esperada");
  anotar("purchase_orders", "'Delivered' pero se recibió menos de lo ordenado", status, "Estatus cambiado a Short-shipped");
  anotar("purchase_orders", "Recibido mayor a lo ordenado", exceso, "Se conserva (posible sobre-entrega)");
  orders = out;
}

// ============================================================ prices
let prices = leer("prices");
{
  prices = sinDuplicadosExactos("prices", prices);
  let moneda = 0, fechasArr = 0, centavos = 0, rangos = 0;
  const out = [];
  const ids = new Set();
  for (const p of prices) {
    const r = { price_id: p.price_id, store_id: tiendaId(p.store_id), sku: skuId(p.sku), unit_price: num(p.unit_price),
      currency: "USD", effective_from: fecha(p.effective_from), effective_to: fecha(p.effective_to), price_list: p.price_list, last_updated: fecha(p.last_updated) };
    if (p.currency !== "USD") moneda++;
    if (r.effective_from !== p.effective_from) fechasArr++;
    if (ids.has(r.price_id)) { rechazar("prices", "price_id repetido", p); continue; }
    if (!tiendaPorId.has(r.store_id)) { rechazar("prices", "tienda inexistente", p); continue; }
    if (r.unit_price == null || r.unit_price <= 0) { rechazar("prices", "precio inválido (TBD, ?, N/A, -1)", p); continue; }
    const base = productoPorSku.get(r.sku)?.list_price_base;
    if (base && r.unit_price > base * 20) { r.unit_price = redondear(r.unit_price / 100); centavos++; }
    if (r.effective_to && r.effective_to < r.effective_from) { r.effective_to = null; rangos++; }
    ids.add(r.price_id);
    asegurarSku(r.sku, "prices");
    out.push(r);
  }
  anotar("prices", "Moneda escrita distinto (US$, usd, 'USD ')", moneda, "Unificada a USD");
  anotar("prices", "Fechas de vigencia en formato MM/DD/YYYY", fechasArr, "Convertidas a YYYY-MM-DD");
  anotar("prices", "Precios capturados en centavos (p. ej. 569 en vez de 5.69)", centavos, "Divididos entre 100");
  anotar("prices", "Vigencia que termina antes de empezar", rangos, "Fin dejado en NULL");
  prices = out;
}

// ============================================================ product_barcodes
let barcodes = leer("product_barcodes");
{
  const vistos = new Set();
  const out = [];
  for (const b of barcodes) {
    const r = { barcode: b.barcode.trim(), sku: skuId(b.sku), barcode_type: b.barcode_type };
    if (vistos.has(r.barcode)) { rechazar("product_barcodes", "código de barras repetido", b); continue; }
    vistos.add(r.barcode);
    asegurarSku(r.sku, "product_barcodes");
    out.push(r);
  }
  anotar("product_barcodes", "Código de barras asignado a más de un SKU", barcodes.length - out.length, "Se conservó el primero");
  barcodes = out;
}

// ============================================================ store_daily_kpis
let kpis = leer("store_daily_kpis");
{
  kpis = sinDuplicadosExactos("store_daily_kpis", kpis);
  let staff = 0, trafico = 0;
  const out = [];
  for (const k of kpis) {
    const r = { store_id: tiendaId(k.store_id), date: fecha(k.date), footfall: num(k.footfall), transactions: num(k.transactions),
      units_sold: num(k.units_sold), net_sales: num(k.net_sales), staff_hours: num(k.staff_hours), open_hours: num(k.open_hours) };
    if (!tiendaPorId.has(r.store_id)) { rechazar("store_daily_kpis", "tienda inexistente", k); continue; }
    if (r.staff_hours != null && (r.staff_hours < 0 || r.staff_hours > 24 * 15)) { r.staff_hours = null; staff++; }
    if (r.footfall != null && (r.footfall === 0 || r.footfall < r.transactions)) { r.footfall = null; trafico++; }
    out.push(r);
  }
  anotar("store_daily_kpis", "Horas de personal imposibles (-5, 999)", staff, "Dejadas en NULL");
  anotar("store_daily_kpis", "Tránsito en 0 o menor que las transacciones", trafico, "Dejado en NULL");
  anotar("store_daily_kpis", "Tránsito vacío", out.filter((r) => r.footfall == null).length - trafico, "Se queda en NULL");
  kpis = out;
}

// ============================================================ weather_daily
let weather = leer("weather_daily");
{
  weather = sinDuplicadosExactos("weather_daily", weather);
  let faltantes = 0, invertidas = 0;
  for (const w of weather) {
    w.temp_max_c = num(w.temp_max_c); w.temp_min_c = num(w.temp_min_c); w.precip_mm = num(w.precip_mm);
    if (w.temp_max_c != null && w.temp_max_c <= -100) { w.temp_max_c = null; faltantes++; }
    if (w.temp_min_c != null && w.temp_min_c <= -100) { w.temp_min_c = null; faltantes++; }
    if (w.temp_max_c != null && w.temp_min_c != null && w.temp_min_c > w.temp_max_c) {
      [w.temp_min_c, w.temp_max_c] = [w.temp_max_c, w.temp_min_c]; invertidas++;
    }
  }
  anotar("weather_daily", "Temperatura -999 (dato faltante)", faltantes, "Dejada en NULL");
  anotar("weather_daily", "Mínima mayor que la máxima", invertidas, "Intercambiadas");
  anotar("weather_daily", "Precipitación vacía", weather.filter((w) => w.precip_mm == null).length, "Se queda en NULL");
}

// ============================================================ SKUs fuera de catálogo
// En vez de perder sus ventas, se agregan al catálogo marcados como en_catalogo = false
for (const [sku, tablas] of skusFaltantes) {
  const precio = prices.find((p) => p.sku === sku)?.unit_price ?? null;
  products.push({ sku, product_name: `(${sku} sin catálogo)`, department: null, category: null, subcategory: null,
    brand: null, supplier_id: orders.find((o) => o.sku === sku)?.supplier_id ?? null, unit_cost: null, list_price_base: precio,
    case_size: null, shelf_life_days: null, is_perishable: null, storage_type: null,
    inventory_tracked: tablas.has("inventory_daily") ? 1 : 0, is_seasonal: null, launch_date: null,
    discontinued_date: null, status: "Unknown", en_catalogo: false });
}
anotar("products", "SKUs que aparecen en ventas/inventario/precios pero no en el catálogo (p. ej. SKU-100040)", skusFaltantes.size, "Agregados con en_catalogo = false para no perder ventas");

// ============================================================ escribir
console.log("Escribiendo", DESTINO);
escribir("sites", ["site_id", "site_name", "site_type", "region", "traffic_tier"], sites);
escribir("suppliers", ["supplier_id", "supplier_name", "category_focus", "standard_lead_time_days", "contract_fill_rate", "contract_on_time_rate", "min_order_value", "delivery_days"], suppliers);
escribir("calendar", ["date", "day_of_week", "iso_week", "month", "year", "quarter_idx", "is_weekend", "is_holiday", "holiday_name", "is_school_break"], calendar);
escribir("stores", ["store_id", "site_id", "store_name", "format", "operator_type", "opening_time", "closing_time", "opened_date", "closed_date", "sqft", "seats"], stores);
escribir("store_closures", ["store_id", "start_date", "end_date", "reason"], closures);
escribir("products", ["sku", "product_name", "department", "category", "subcategory", "brand", "supplier_id", "unit_cost", "list_price_base", "case_size", "shelf_life_days", "is_perishable", "storage_type", "inventory_tracked", "is_seasonal", "launch_date", "discontinued_date", "status", "en_catalogo"], products);
escribir("product_barcodes", ["barcode", "sku", "barcode_type"], barcodes);
escribir("promotions", ["promo_id", "promo_name", "promo_type", "start_date", "end_date", "discount_pct", "department", "category", "region_scope", "expected_uplift_pct"], promotions);
escribir("prices", ["price_id", "store_id", "sku", "unit_price", "currency", "effective_from", "effective_to", "price_list", "last_updated"], prices);
escribir("sales_daily", ["date", "store_id", "sku", "units_sold", "unit_price", "gross_sales", "discount_amount", "net_sales", "promo_id"], sales);
escribir("inventory_daily", ["date", "store_id", "sku", "opening_qty", "received_qty", "units_sold", "expired_qty", "damaged_qty", "closing_qty", "on_order_qty", "stockout_hours"], inventory);
escribir("purchase_orders", ["po_id", "store_id", "supplier_id", "sku", "order_date", "expected_date", "received_date", "qty_ordered", "qty_received", "unit_cost", "status"], orders);
escribir("store_daily_kpis", ["store_id", "date", "footfall", "transactions", "units_sold", "net_sales", "staff_hours", "open_hours"], kpis);
escribir("weather_daily", ["site_id", "date", "temp_max_c", "temp_min_c", "precip_mm"], weather);
escribir("rechazos", ["tabla", "motivo", "fila"], rechazos);

// Reporte de calidad en Markdown (útil para el pitch: el reto pide documentarlo)
const resumenRechazos = {};
for (const r of rechazos) {
  const k = `${r.tabla}|${r.motivo}`;
  resumenRechazos[k] = (resumenRechazos[k] || 0) + 1;
}
const md = [
  "# Reporte de calidad de datos – Otzo",
  "",
  `Generado por \`backend/db/seeds/limpiar.js\` el ${new Date().toISOString().slice(0, 16).replace("T", " ")}.`,
  "",
  "## Correcciones aplicadas",
  "",
  "| Tabla | Problema | Filas | Acción |",
  "|---|---|---:|---|",
  ...reporte.map((r) => `| ${r.tabla} | ${r.problema} | ${r.filas} | ${r.accion} |`),
  "",
  "## Filas descartadas (detalle en `rechazos.csv`)",
  "",
  "| Tabla | Motivo | Filas |",
  "|---|---|---:|",
  ...Object.entries(resumenRechazos).map(([k, n]) => `| ${k.split("|")[0]} | ${k.split("|")[1]} | ${n} |`),
  "",
];
fs.writeFileSync(path.join(DESTINO, "reporte_calidad.md"), md.join("\n"));
console.log(`Listo: ${reporte.length} tipos de corrección, ${rechazos.length} filas descartadas. Ver datos_limpios/reporte_calidad.md`);
