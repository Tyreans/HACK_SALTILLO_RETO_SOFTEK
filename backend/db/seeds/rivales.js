// Llena la base de rivales (schema "rivales") con datos de EJEMPLO.
//
//   npm run db:rivales
//
// Crea 3 cadenas ficticias con sucursales en los mismos sitios que Otzo, su catálogo
// (ligado a nuestro producto equivalente) y 4 semanas de precios. Todo es inventado:
// sirve para la demo y para probar las recomendaciones de precio y el chatbot.
// Cuando haya scraper, sus datos van a las mismas tablas (fuente = 'scraper').
//
// Se puede correr varias veces: borra los datos de ejemplo y los vuelve a generar.

import { createHash } from "node:crypto";
import { pool, query } from "../../src/config/db.config.js";

// Número estable entre 0 y 1 a partir de un texto (los datos no cambian entre corridas)
const h = (...partes) => createHash("sha1").update(partes.join("|")).digest().readUInt32BE(0) / 0xffffffff;
const r2 = (n) => Math.round(n * 100) / 100;
const hoy = new Date();
const fecha = (diasAtras) => {
  const d = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate() - diasAtras));
  return d.toISOString().slice(0, 10);
};

const CADENAS = [
  { cadena_id: "RV1", nombre: "Café Brújula", posicionamiento: "premium",
    descripcion: "Cafetería de especialidad; precios altos, fuerte en café y panadería fina",
    factor: [1.08, 1.25], fuerte: ["Coffee & Tea", "Specialty Beverage", "Bakery"] },
  { cadena_id: "RV2", nombre: "Pan & Paso", posicionamiento: "economica",
    descripcion: "Panadería rápida y económica; promociones frecuentes",
    factor: [0.78, 0.93], fuerte: ["Bakery", "Sandwiches", "Grab & Go"] },
  { cadena_id: "RV3", nombre: "Kiosko Andén", posicionamiento: "conveniencia",
    descripcion: "Tienda de conveniencia; precios cercanos al promedio, mucho producto empacado",
    factor: [0.95, 1.1], fuerte: ["Packaged Beverage", "Grab & Go", "Souvenir & Merch", "Sweet Snacks"] },
];
const ZONAS = ["Sala de llegadas", "Pasillo central", "Zona de comida", "Junto a seguridad", "Puerta de abordaje", "Vestíbulo"];
const SEMANAS = [21, 14, 7, 0]; // días atrás de cada levantamiento de precios

async function insertarLotes(sql, columnas, filas, tam = 2000) {
  for (let i = 0; i < filas.length; i += tam) {
    const lote = filas.slice(i, i + tam);
    await query(sql, columnas.map((c) => lote.map((f) => f[c])));
  }
}

console.log("Generando base de rivales (datos de ejemplo)...");

const { rows: existe } = await query(`SELECT to_regclass('rivales.precios') IS NOT NULL AS ok`);
if (!existe[0].ok) {
  console.error("No existe la base de rivales. Corre primero la migración db/migrations/005_rivales.sql (o npm run db:cargar).");
  await pool.end();
  process.exit(1);
}

// Limpia solo lo generado como demo; lo que traiga el scraper se respeta
await query(`DELETE FROM rivales.precios WHERE fuente = 'demo'`);
await query(`DELETE FROM rivales.productos WHERE cadena_id IN ('RV1','RV2','RV3')
              AND NOT EXISTS (SELECT 1 FROM rivales.precios p WHERE p.producto_id = rivales.productos.producto_id)`);
await query(`DELETE FROM rivales.tiendas WHERE cadena_id IN ('RV1','RV2','RV3')
              AND NOT EXISTS (SELECT 1 FROM rivales.precios p WHERE p.tienda_id = rivales.tiendas.tienda_id)`);

for (const c of CADENAS) {
  await query(
    `INSERT INTO rivales.cadenas (cadena_id, nombre, posicionamiento, descripcion) VALUES ($1,$2,$3,$4)
     ON CONFLICT (cadena_id) DO UPDATE SET nombre = EXCLUDED.nombre, posicionamiento = EXCLUDED.posicionamiento, descripcion = EXCLUDED.descripcion`,
    [c.cadena_id, c.nombre, c.posicionamiento, c.descripcion]
  );
}

// Nuestro precio vigente promedio por sitio y producto: base para inventar el del rival
const { rows: base } = await query(
  `SELECT st.site_id, si.site_name, si.traffic_tier, pv.sku, p.product_name, p.category, avg(pv.unit_price) AS precio
     FROM v_precio_vigente pv
     JOIN stores st USING (store_id)
     JOIN sites si ON si.site_id = st.site_id
     JOIN products p ON p.sku = pv.sku
    WHERE p.en_catalogo
    GROUP BY st.site_id, si.site_name, si.traffic_tier, pv.sku, p.product_name, p.category`
);
const sitios = new Map();
for (const b of base) {
  if (!sitios.has(b.site_id)) sitios.set(b.site_id, { nombre: b.site_name, trafico: Number(b.traffic_tier), productos: [] });
  sitios.get(b.site_id).productos.push(b);
}

const tiendas = [], productos = new Map(), precios = [];
for (const [siteId, s] of sitios) {
  // Sitios con más tráfico tienen más competencia: 2 cadenas, o las 3 si el tráfico es alto
  const cadenas = CADENAS.filter((c) => h(siteId, c.cadena_id) < (s.trafico >= 1.3 ? 1 : 0.67)).slice(0, s.trafico >= 1.3 ? 3 : 2);
  if (!cadenas.length) cadenas.push(CADENAS[Math.floor(h(siteId) * 3)]);

  for (const c of cadenas) {
    const tiendaId = `${c.cadena_id}-${siteId}`;
    tiendas.push({ tienda_id: tiendaId, cadena_id: c.cadena_id, site_id: siteId, nombre: `${c.nombre} – ${s.nombre}`,
      ubicacion: ZONAS[Math.floor(h(tiendaId) * ZONAS.length)] });

    for (const b of s.productos) {
      // Cada cadena maneja más productos de su especialidad
      const cobertura = c.fuerte.includes(b.category) ? 0.85 : 0.35;
      if (h(c.cadena_id, b.sku) > cobertura) continue;
      const productoId = `${c.cadena_id}-${b.sku}`;
      productos.set(productoId, { producto_id: productoId, cadena_id: c.cadena_id, nombre: b.product_name,
        categoria: b.category, sku_equivalente: b.sku });

      const [min, max] = c.factor;
      const factor = min + (max - min) * h(c.cadena_id, b.sku, "precio");
      for (const dias of SEMANAS) {
        const deriva = 1 + (h(tiendaId, b.sku, dias) - 0.5) * 0.04; // ±2 % entre semanas
        const precio = r2(Math.max(0.5, Number(b.precio) * factor * deriva));
        const enPromo = h(tiendaId, b.sku, dias, "promo") < (c.posicionamiento === "economica" ? 0.15 : 0.06);
        precios.push({ tienda_id: tiendaId, producto_id: productoId, fecha: fecha(dias), precio,
          precio_promo: enPromo ? r2(precio * 0.8) : null, fuente: "demo" });
      }
    }
  }
}

await insertarLotes(
  `INSERT INTO rivales.tiendas (tienda_id, cadena_id, site_id, nombre, ubicacion)
   SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[])
   ON CONFLICT (tienda_id) DO UPDATE SET nombre = EXCLUDED.nombre, ubicacion = EXCLUDED.ubicacion`,
  ["tienda_id", "cadena_id", "site_id", "nombre", "ubicacion"], tiendas
);
await insertarLotes(
  `INSERT INTO rivales.productos (producto_id, cadena_id, nombre, categoria, sku_equivalente)
   SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[])
   ON CONFLICT (producto_id) DO UPDATE SET nombre = EXCLUDED.nombre, categoria = EXCLUDED.categoria`,
  ["producto_id", "cadena_id", "nombre", "categoria", "sku_equivalente"], [...productos.values()]
);
await insertarLotes(
  `INSERT INTO rivales.precios (tienda_id, producto_id, fecha, precio, precio_promo, fuente)
   SELECT * FROM unnest($1::text[], $2::text[], $3::date[], $4::numeric[], $5::numeric[], $6::text[])
   ON CONFLICT (tienda_id, producto_id, fecha) DO UPDATE SET precio = EXCLUDED.precio, precio_promo = EXCLUDED.precio_promo`,
  ["tienda_id", "producto_id", "fecha", "precio", "precio_promo", "fuente"], precios
);

console.log(`Listo: ${CADENAS.length} cadenas, ${tiendas.length} sucursales rivales en ${sitios.size} sitios, ` +
  `${productos.size} productos y ${precios.length} precios (4 semanas).`);
await pool.end();
