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

// ------------------------------------------------------------------ base de rivales

// Sucursales rivales en el mismo sitio (aeropuerto/estación) que la tienda
export async function rivalesDeTienda(tienda) {
  const { rows } = await query(
    `SELECT t.tienda_id, t.nombre, t.ubicacion, c.cadena_id, c.nombre AS cadena, c.posicionamiento, c.descripcion,
            count(DISTINCT p.producto_id)::int AS productos, max(p.fecha)::text AS ultimo_precio
       FROM stores s
       JOIN rivales.tiendas t ON t.site_id = s.site_id
       JOIN rivales.cadenas c USING (cadena_id)
       LEFT JOIN rivales.precios p ON p.tienda_id = t.tienda_id
      WHERE s.store_id = $1
      GROUP BY t.tienda_id, t.nombre, t.ubicacion, c.cadena_id, c.nombre, c.posicionamiento, c.descripcion
      ORDER BY c.nombre`,
    [tienda]
  );
  return rows;
}

// Nuestro precio vs. el último precio NORMAL de cada rival del mismo sitio, por producto
// (precio_promo viene aparte en cada rival, por si está en oferta)
export async function compararTienda({ tienda, sku, texto, limite = 20 }) {
  const { rows } = await query(
    `WITH ult AS (
       SELECT DISTINCT ON (p.tienda_id, p.producto_id)
              p.tienda_id, p.producto_id, p.precio, p.precio_promo, p.fecha
         FROM rivales.precios p
        ORDER BY p.tienda_id, p.producto_id, p.fecha DESC
     )
     SELECT pv.sku, pr.product_name AS producto, pr.category AS categoria, pv.unit_price AS nuestro_precio,
            round(avg(u.precio), 2) AS promedio_rivales,
            min(u.precio) AS minimo_rivales,
            round(100.0 * (pv.unit_price - avg(u.precio)) / avg(u.precio), 1) AS diferencia_pct,
            bool_or(u.precio_promo IS NOT NULL) AS rival_en_promocion,
            json_agg(json_build_object('cadena', c.nombre, 'posicionamiento', c.posicionamiento, 'precio', u.precio,
                                       'precio_promo', u.precio_promo, 'fecha', u.fecha::text) ORDER BY coalesce(u.precio_promo, u.precio)) AS rivales
       FROM stores s
       JOIN v_precio_vigente pv ON pv.store_id = s.store_id
       JOIN products pr ON pr.sku = pv.sku
       JOIN rivales.productos rp ON rp.sku_equivalente = pv.sku
       JOIN rivales.tiendas t ON t.site_id = s.site_id AND t.cadena_id = rp.cadena_id
       JOIN rivales.cadenas c ON c.cadena_id = t.cadena_id
       JOIN ult u ON u.tienda_id = t.tienda_id AND u.producto_id = rp.producto_id
      WHERE s.store_id = $1
        AND ($2::text IS NULL OR pv.sku = $2)
        AND ($3::text IS NULL OR pr.product_name ILIKE $3)
      GROUP BY pv.sku, pr.product_name, pr.category, pv.unit_price
      ORDER BY abs(pv.unit_price - avg(u.precio)) / avg(u.precio) DESC
      LIMIT $4`,
    [tienda, sku ?? null, texto ? `%${texto}%` : null, limite]
  );
  return rows;
}
