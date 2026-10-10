import { query } from "../config/db.config.js";

const COLUMNAS = `
  s.store_id, s.store_name, s.format, s.operator_type,
  to_char(s.opening_time, 'HH24:MI') AS opening_time,
  to_char(s.closing_time, 'HH24:MI') AS closing_time,
  s.opened_date, s.closed_date, s.sqft, s.seats,
  si.site_id, si.site_name, si.site_type, si.region, si.traffic_tier`;

export async function listar({ region } = {}) {
  const { rows } = await query(
    `SELECT ${COLUMNAS}
       FROM stores s JOIN sites si USING (site_id)
      WHERE ($1::text IS NULL OR si.region = $1)
      ORDER BY s.store_id`,
    [region ?? null]
  );
  return rows;
}

export async function obtener(storeId) {
  const { rows } = await query(
    `SELECT ${COLUMNAS}
       FROM stores s JOIN sites si USING (site_id)
      WHERE s.store_id = $1`,
    [storeId]
  );
  return rows[0] ?? null;
}

export async function cierres(storeId) {
  const { rows } = await query(
    `SELECT start_date, end_date, reason FROM store_closures WHERE store_id = $1 ORDER BY start_date`,
    [storeId]
  );
  return rows;
}

// Promociones de la tienda: las propias (aceptadas en el panel de IA) y las de cadena que le aplican
export async function promociones(storeId, { soloVigentes = false } = {}) {
  const { rows } = await query(
    `SELECT promo_id, promo_name, promo_type, discount_pct, start_date::text AS inicio, end_date::text AS fin,
            department, category, sku, producto, origen, recomendacion_id, alcance,
            (CURRENT_DATE BETWEEN start_date AND end_date) AS vigente
       FROM v_promociones_tienda
      WHERE store_id = $1 AND (NOT $2 OR CURRENT_DATE BETWEEN start_date AND end_date)
      ORDER BY (alcance = 'tienda') DESC, start_date DESC`,
    [storeId, soloVigentes]
  );
  return rows;
}
