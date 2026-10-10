import { query, pool } from "../config/db.config.js";
import { ApiError } from "../utils/apiError.js";

export async function delDia(tienda) {
  const { rows } = await query(
    `SELECT * FROM recomendaciones
      WHERE store_id = $1 AND creada_en::date = CURRENT_DATE
      ORDER BY CASE prioridad WHEN 'alta' THEN 0 WHEN 'media' THEN 1 ELSE 2 END, id`,
    [tienda]
  );
  return rows;
}

export async function borrarPendientes(tienda) {
  await query(`DELETE FROM recomendaciones WHERE store_id = $1 AND estado = 'pendiente'`, [tienda]);
}

export async function crear(tienda, items) {
  const filas = [];
  for (const i of items) {
    const { rows } = await query(
      `INSERT INTO recomendaciones
         (store_id, tipo, prioridad, titulo, descripcion, sku, precio_actual, precio_propuesto)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [tienda, i.tipo, i.prioridad, i.titulo, i.descripcion, i.sku ?? null, i.precio_actual ?? null, i.precio_propuesto ?? null]
    );
    filas.push(rows[0]);
  }
  return filas;
}

export async function precioVigente(tienda, sku) {
  const { rows } = await query(
    `SELECT v.unit_price, p.unit_cost
       FROM v_precio_vigente v JOIN products p USING (sku)
      WHERE v.store_id = $1 AND v.sku = $2`,
    [tienda, sku]
  );
  return rows[0] ?? null;
}

async function pendiente(client, id) {
  const { rows } = await client.query(`SELECT * FROM recomendaciones WHERE id = $1 FOR UPDATE`, [id]);
  if (!rows[0]) throw new ApiError(404, "Recomendación no encontrada");
  if (rows[0].estado !== "pendiente") throw new ApiError(409, "Esta recomendación ya fue resuelta");
  return rows[0];
}

export async function rechazar(id) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await pendiente(client, id);
    const { rows } = await client.query(
      `UPDATE recomendaciones SET estado = 'rechazada', resuelta_en = now() WHERE id = $1 RETURNING *`, [id]);
    await client.query("COMMIT");
    return rows[0];
  } catch (e) { await client.query("ROLLBACK"); throw e; } finally { client.release(); }
}

export async function editarPrecio(id, precio) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const r = await pendiente(client, id);
    if (r.tipo !== "precio") throw new ApiError(400, "Solo las recomendaciones de precio se editan");
    const { rows } = await client.query(
      `UPDATE recomendaciones SET precio_propuesto = $2 WHERE id = $1 RETURNING *`, [id, precio]);
    await client.query("COMMIT");
    return rows[0];
  } catch (e) { await client.query("ROLLBACK"); throw e; } finally { client.release(); }
}

// Si es de precio: cierra el precio vigente y abre uno nuevo en `prices`.
export async function aceptar(id, precioFinal) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const r = await pendiente(client, id);
    let precio = r.precio_propuesto;
    if (r.tipo === "precio") {
      precio = precioFinal ?? r.precio_propuesto;
      await client.query(
        `UPDATE prices SET effective_to = CURRENT_DATE - 1, last_updated = CURRENT_DATE
          WHERE store_id = $1 AND sku = $2 AND effective_to IS NULL`, [r.store_id, r.sku]);
      await client.query(
        `INSERT INTO prices (price_id, store_id, sku, unit_price, currency, effective_from, price_list, last_updated)
         VALUES ($1, $2, $3, $4, 'USD', CURRENT_DATE, 'otzo-web', CURRENT_DATE)`,
        [`WEB-${Date.now()}-${id}`, r.store_id, r.sku, precio]);
    }
    const { rows } = await client.query(
      `UPDATE recomendaciones SET estado = 'aceptada', resuelta_en = now(), precio_propuesto = $2
        WHERE id = $1 RETURNING *`, [id, precio]);
    await client.query("COMMIT");
    return rows[0];
  } catch (e) { await client.query("ROLLBACK"); throw e; } finally { client.release(); }
}
