import { query } from "../config/db.config.js";

// Consultas que arman la lista de productos candidatos para cada tipo de recomendación.
// Todas miran los últimos 7 días que terminan en `hasta` (el último día con datos).
const VENTANA = 7;

// Re-stock: existencia, en camino, venta diaria, caja del proveedor y tiempo de entrega
export async function reposicion(tienda, hasta) {
  const { rows } = await query(
    `WITH venta AS (
       SELECT sku, sum(units_sold)::numeric / $3::int AS venta_diaria
         FROM inventory_daily
        WHERE store_id = $1 AND date BETWEEN ($2::date - ($3::int - 1)) AND $2::date
        GROUP BY sku
     )
     SELECT p.sku, p.product_name AS producto,
            coalesce(p.is_perishable, false) AS perecedero,
            coalesce(p.shelf_life_days, 30) AS vida_util,
            greatest(coalesce(p.case_size, 1), 1) AS caja,
            coalesce(s.standard_lead_time_days, 2) AS entrega,
            v.venta_diaria, h.closing_qty AS existencia, h.on_order_qty AS en_camino
       FROM venta v
       JOIN inventory_daily h ON h.store_id = $1 AND h.sku = v.sku AND h.date = $2::date
       JOIN products p ON p.sku = v.sku
       LEFT JOIN suppliers s ON s.supplier_id = p.supplier_id
      WHERE p.en_catalogo AND p.inventory_tracked IS NOT FALSE
        AND p.discontinued_date IS NULL AND v.venta_diaria > 0`,
    [tienda, hasta, VENTANA]
  );
  return rows;
}

// Promociones: productos con exceso de inventario o con merma por caducidad
export async function promocion(tienda, hasta) {
  const { rows } = await query(
    `WITH venta AS (
       SELECT sku, sum(units_sold)::numeric / $3::int AS venta_diaria,
              sum(units_sold) AS vendido, sum(expired_qty) AS caducado
         FROM inventory_daily
        WHERE store_id = $1 AND date BETWEEN ($2::date - ($3::int - 1)) AND $2::date
        GROUP BY sku
     )
     SELECT p.sku, p.product_name AS producto,
            coalesce(p.is_perishable, false) AS perecedero,
            coalesce(p.shelf_life_days, 30) AS vida_util,
            v.venta_diaria, v.vendido, v.caducado, h.closing_qty AS existencia,
            pv.unit_price AS precio, coalesce(p.unit_cost, 0) AS costo
       FROM venta v
       JOIN inventory_daily h ON h.store_id = $1 AND h.sku = v.sku AND h.date = $2::date
       JOIN products p ON p.sku = v.sku
       JOIN v_precio_vigente pv ON pv.store_id = $1 AND pv.sku = v.sku
      WHERE p.en_catalogo AND p.discontinued_date IS NULL AND h.closing_qty > 0`,
    [tienda, hasta, VENTANA]
  );
  return rows;
}

// Precios: solo productos de la tienda que tienen precio de competencia (últimos 30 días)
export async function precios(tienda, hasta) {
  const { rows } = await query(
    `SELECT p.sku, p.product_name AS producto, pv.unit_price AS precio,
            coalesce(p.unit_cost, 0) AS costo,
            c.promedio, c.minimo, c.n AS competidores, coalesce(v.unidades, 0) AS unidades
       FROM v_precio_vigente pv
       JOIN products p ON p.sku = pv.sku
       JOIN LATERAL (
         SELECT avg(pc.precio) AS promedio, min(pc.precio) AS minimo, count(*)::int AS n
           FROM precios_competencia pc
          WHERE pc.sku = pv.sku AND pc.fecha >= CURRENT_DATE - 30
         HAVING count(*) > 0
       ) c ON true
       LEFT JOIN LATERAL (
         SELECT sum(i.units_sold) AS unidades
           FROM inventory_daily i
          WHERE i.store_id = $1 AND i.sku = pv.sku AND i.date BETWEEN ($2::date - 6) AND $2::date
       ) v ON true
      WHERE pv.store_id = $1 AND p.en_catalogo`,
    [tienda, hasta]
  );
  return rows;
}

// Datos básicos de un producto en una tienda (para altas manuales del gerente)
export async function producto(tienda, sku) {
  const { rows } = await query(
    `SELECT p.sku, p.product_name AS producto, pv.unit_price AS precio, coalesce(p.unit_cost, 0) AS costo
       FROM products p
       LEFT JOIN v_precio_vigente pv ON pv.sku = p.sku AND pv.store_id = $1
      WHERE p.sku = $2 AND p.en_catalogo`,
    [tienda, sku]
  );
  return rows[0] ?? null;
}
