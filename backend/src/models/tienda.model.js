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
