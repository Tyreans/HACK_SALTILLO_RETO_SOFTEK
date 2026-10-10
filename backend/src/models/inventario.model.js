import { query } from "../config/db.config.js";

export async function ultimaFecha() {
  const { rows } = await query(`SELECT max(date) AS fecha FROM inventory_daily`);
  return rows[0].fecha;
}

// Movimiento de inventario de un día (una tienda o todas)
export async function porDia({ fecha, tienda, categoria, soloAlertas }) {
  const { rows } = await query(
    `SELECT date AS fecha, store_id AS tienda, store_name, site_name AS sitio,
            sku, product_name AS producto, category AS categoria,
            opening_qty AS inicial, received_qty AS recibido, units_sold AS vendidos,
            expired_qty AS caducado, damaged_qty AS danado, closing_qty AS cierre,
            on_order_qty AS en_camino, stockout_hours AS horas_sin_stock, valor_inventario
       FROM v_inventario_diario
      WHERE date = $1
        AND ($2::text IS NULL OR store_id = $2)
        AND ($3::text IS NULL OR category = $3)
        AND (NOT $4 OR stockout_hours > 0 OR closing_qty = 0 OR expired_qty > 0)
      ORDER BY store_id, category, product_name`,
    [fecha, tienda ?? null, categoria ?? null, Boolean(soloAlertas)]
  );
  return rows;
}

// Totales por tienda en un rango: ventas, merma y quiebres de stock
export async function resumenPorTienda({ desde, hasta, tienda }) {
  const { rows } = await query(
    `SELECT store_id AS tienda, max(store_name) AS store_name, max(site_name) AS sitio,
            sum(units_sold) AS vendidos, sum(expired_qty) AS caducado, sum(damaged_qty) AS danado,
            round(sum(stockout_hours), 1) AS horas_sin_stock,
            count(*) FILTER (WHERE stockout_hours > 0) AS dias_producto_con_quiebre,
            round(100.0 * sum(expired_qty) / NULLIF(sum(units_sold) + sum(expired_qty), 0), 2) AS pct_merma
       FROM v_inventario_diario
      WHERE date BETWEEN $1 AND $2
        AND ($3::text IS NULL OR store_id = $3)
      GROUP BY store_id
      ORDER BY pct_merma DESC NULLS LAST`,
    [desde, hasta, tienda ?? null]
  );
  return rows;
}
