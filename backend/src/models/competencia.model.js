import { query } from "../config/db.config.js";

// Inserta o actualiza precios de la competencia. Ignora SKUs que no existen en el catálogo.
export async function cargar(filas) {
  const { rowCount } = await query(
    `INSERT INTO precios_competencia (sku, competidor, precio, fecha, fuente)
     SELECT t.sku, t.competidor, t.precio, t.fecha, t.fuente
       FROM unnest($1::text[], $2::text[], $3::numeric[], $4::date[], $5::text[])
            AS t(sku, competidor, precio, fecha, fuente)
      WHERE EXISTS (SELECT 1 FROM products p WHERE p.sku = t.sku)
     ON CONFLICT (sku, competidor, fecha) DO UPDATE SET precio = EXCLUDED.precio, fuente = EXCLUDED.fuente`,
    [filas.map((f) => f.sku), filas.map((f) => f.competidor), filas.map((f) => f.precio),
     filas.map((f) => f.fecha), filas.map((f) => f.fuente)]
  );
  return rowCount;
}

// Último precio de cada competidor (por SKU si se indica)
export async function ultimos({ sku }) {
  const { rows } = await query(
    `SELECT DISTINCT ON (pc.sku, pc.competidor)
            pc.sku, p.product_name AS producto, pc.competidor, pc.precio, pc.fecha, pc.fuente
       FROM precios_competencia pc JOIN products p ON p.sku = pc.sku
      WHERE ($1::text IS NULL OR pc.sku = $1)
      ORDER BY pc.sku, pc.competidor, pc.fecha DESC
      LIMIT 500`,
    [sku ?? null]
  );
  return rows;
}
