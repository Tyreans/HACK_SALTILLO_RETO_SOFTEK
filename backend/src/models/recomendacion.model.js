import { query, pool } from "../config/db.config.js";
import { ApiError } from "../utils/apiError.js";

export const TIPOS = ["reposicion", "promocion", "precio"];

// Qué campo editable corresponde a cada tipo
const CAMPO_EDITABLE = { reposicion: "cantidad", promocion: "descuento_pct", precio: "precio" };

// Una fila por producto, con el nombre y (si es de precio) lo que cobra la competencia
const SELECT_FILA = `
  SELECT r.id, r.store_id, r.tipo, r.prioridad, r.sku, p.product_name AS producto,
         r.descripcion, r.origen, r.estado, r.editada,
         r.cantidad, r.descuento_pct, r.precio_actual, r.precio_propuesto,
         r.motivo_rechazo, r.propuesta_original, r.creada_en, r.resuelta_en,
         CASE WHEN c.n IS NULL THEN NULL
              ELSE json_build_object('promedio', round(c.promedio, 2), 'minimo', c.minimo, 'competidores', c.n)
         END AS competencia
    FROM recomendaciones r
    LEFT JOIN products p ON p.sku = r.sku
    LEFT JOIN LATERAL (
      SELECT avg(pc.precio) AS promedio, min(pc.precio) AS minimo, count(*)::int AS n
        FROM precios_competencia pc
       WHERE r.tipo = 'precio' AND pc.sku = r.sku AND pc.fecha >= CURRENT_DATE - 30
      HAVING count(*) > 0
    ) c ON true`;

const ORDEN = `ORDER BY CASE r.prioridad WHEN 'alta' THEN 0 WHEN 'media' THEN 1 ELSE 2 END, r.id`;

const fila = async (runner, id) => (await runner.query(`${SELECT_FILA} WHERE r.id = $1`, [id])).rows[0];

// ------------------------------------------------------------------ lectura

// Lo de hoy (cualquier estado) + lo que el gerente dejó pendiente de otros días
export async function delDia(tienda, tipo = null) {
  const { rows } = await query(
    `${SELECT_FILA}
      WHERE r.store_id = $1 AND ($2::text IS NULL OR r.tipo = $2)
        AND (r.creada_en::date = CURRENT_DATE OR (r.origen = 'gerente' AND r.estado = 'pendiente'))
      ${ORDEN}`,
    [tienda, tipo]
  );
  return rows;
}

export async function hayAgenteHoy(tienda, tipo) {
  const { rowCount } = await query(
    `SELECT 1 FROM recomendaciones
      WHERE store_id = $1 AND tipo = $2 AND origen = 'agente' AND creada_en::date = CURRENT_DATE LIMIT 1`,
    [tienda, tipo]
  );
  return rowCount > 0;
}

// ------------------------------------------------------------------ aprendizaje

// Productos que el agente NO debe volver a sugerir: los que el gerente rechazó hace poco,
// los que ya aceptó hoy y los que él mismo dejó pendientes a mano.
export async function skusExcluidos(tienda, tipo, dias = 7) {
  const { rows } = await query(
    `SELECT DISTINCT sku FROM recomendaciones
      WHERE store_id = $1 AND tipo = $2 AND (
            (estado = 'rechazada' AND origen = 'agente' AND resuelta_en >= now() - make_interval(days => $3::int))
         OR (estado = 'aceptada' AND resuelta_en::date = CURRENT_DATE)
         OR (estado = 'pendiente' AND origen = 'gerente'))`,
    [tienda, tipo, dias]
  );
  return new Set(rows.map((r) => r.sku));
}

// Cuánto suele corregir el gerente lo que propone el agente (promedio de las últimas 3 aceptadas).
// 0.6 = el gerente acepta alrededor del 60 % de la cantidad / descuento propuesto.
export async function factoresAprendidos(tienda, tipo) {
  const col = { reposicion: "cantidad", promocion: "descuento_pct" }[tipo];
  if (!col) return new Map();
  const { rows } = await query(
    `SELECT sku, avg(${col}::numeric / NULLIF((propuesta_original->>'${col}')::numeric, 0)) AS factor
       FROM (SELECT sku, ${col}, propuesta_original,
                    row_number() OVER (PARTITION BY sku ORDER BY resuelta_en DESC) AS rn
               FROM recomendaciones
              WHERE store_id = $1 AND tipo = $2 AND estado = 'aceptada' AND origen = 'agente') x
      WHERE rn <= 3
      GROUP BY sku`,
    [tienda, tipo]
  );
  return new Map(rows.filter((r) => r.factor != null).map((r) => [r.sku, r.factor]));
}

// ------------------------------------------------------------------ altas

// Reemplaza las pendientes del agente para (tienda, tipo). Con el candado evita duplicados
// si dos pantallas piden lo mismo al mismo tiempo.
export async function reemplazarAgente(tienda, tipo, items, { regenerar = false } = {}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`rec:${tienda}:${tipo}`]);
    if (!regenerar) {
      const ya = await client.query(
        `SELECT 1 FROM recomendaciones
          WHERE store_id = $1 AND tipo = $2 AND origen = 'agente' AND creada_en::date = CURRENT_DATE LIMIT 1`,
        [tienda, tipo]
      );
      if (ya.rowCount) { await client.query("COMMIT"); return false; }
    }
    await client.query(
      `DELETE FROM recomendaciones
        WHERE store_id = $1 AND tipo = $2 AND origen = 'agente' AND estado = 'pendiente'`,
      [tienda, tipo]
    );
    for (const i of items) {
      await client.query(
        `INSERT INTO recomendaciones
           (store_id, tipo, prioridad, titulo, descripcion, sku, cantidad, descuento_pct,
            precio_actual, precio_propuesto, origen, propuesta_original)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'agente',$11)`,
        [tienda, tipo, i.prioridad, i.producto, i.descripcion, i.sku, i.cantidad ?? null,
         i.descuento_pct ?? null, i.precio_actual ?? null, i.precio_propuesto ?? null,
         JSON.stringify({ cantidad: i.cantidad ?? null, descuento_pct: i.descuento_pct ?? null, precio_propuesto: i.precio_propuesto ?? null })]
      );
    }
    await client.query("COMMIT");
    return true;
  } catch (e) { await client.query("ROLLBACK"); throw e; } finally { client.release(); }
}

// Opción que agrega el gerente a mano
export async function crearManual({ tienda, tipo, producto, cantidad, descuento_pct, precio, motivo }) {
  const valores = { cantidad: cantidad ?? null, descuento_pct: descuento_pct ?? null, precio_propuesto: precio ?? null };
  const dup = await query(
    `SELECT 1 FROM recomendaciones WHERE store_id = $1 AND tipo = $2 AND sku = $3 AND estado = 'pendiente' LIMIT 1`,
    [tienda, tipo, producto.sku]
  );
  if (dup.rowCount) throw new ApiError(409, "Ya hay una recomendación pendiente de este tipo para ese producto");
  const { rows } = await query(
    `INSERT INTO recomendaciones
       (store_id, tipo, prioridad, titulo, descripcion, sku, cantidad, descuento_pct,
        precio_actual, precio_propuesto, origen, propuesta_original)
     VALUES ($1,$2,'media',$3,$4,$5,$6,$7,$8,$9,'gerente',$10) RETURNING id`,
    [tienda, tipo, producto.producto, motivo || "Agregada por el gerente", producto.sku,
     valores.cantidad, valores.descuento_pct, producto.precio ?? null, valores.precio_propuesto, JSON.stringify(valores)]
  );
  return fila({ query }, rows[0].id);
}

// ------------------------------------------------------------------ decisiones

async function pendiente(client, id) {
  const { rows } = await client.query(`SELECT * FROM recomendaciones WHERE id = $1 FOR UPDATE`, [id]);
  if (!rows[0]) throw new ApiError(404, "Recomendación no encontrada");
  if (rows[0].estado !== "pendiente") throw new ApiError(409, "Esta recomendación ya fue resuelta");
  return rows[0];
}

// Mezcla los cambios del gerente con los valores actuales; solo se permite el campo de ese tipo
function aplicar(r, ajustes) {
  for (const k of Object.keys(ajustes)) {
    if (k !== CAMPO_EDITABLE[r.tipo]) throw new ApiError(400, `Una recomendación de ${r.tipo} solo admite "${CAMPO_EDITABLE[r.tipo]}"`);
  }
  const v = {
    cantidad: ajustes.cantidad ?? r.cantidad,
    descuento_pct: ajustes.descuento_pct ?? r.descuento_pct,
    precio_propuesto: ajustes.precio ?? r.precio_propuesto,
  };
  const cambio = v.cantidad !== r.cantidad || v.descuento_pct !== r.descuento_pct || v.precio_propuesto !== r.precio_propuesto;
  return { v, cambio };
}

async function transaccion(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (e) { await client.query("ROLLBACK"); throw e; } finally { client.release(); }
}

export const editar = (id, ajustes) => transaccion(async (client) => {
  const r = await pendiente(client, id);
  const { v, cambio } = aplicar(r, ajustes);
  await client.query(
    `UPDATE recomendaciones SET cantidad = $2, descuento_pct = $3, precio_propuesto = $4, editada = editada OR $5 WHERE id = $1`,
    [id, v.cantidad, v.descuento_pct, v.precio_propuesto, cambio]
  );
  return fila(client, id);
});

export const rechazar = (id, motivo) => transaccion(async (client) => {
  await pendiente(client, id);
  await client.query(
    `UPDATE recomendaciones SET estado = 'rechazada', resuelta_en = now(), motivo_rechazo = $2 WHERE id = $1`,
    [id, motivo || null]
  );
  return fila(client, id);
});

// Aceptar = decisión del gerente + efecto real:
//  - reposición → crea una orden de compra en tránsito (purchase_orders)
//  - precio     → cierra el precio vigente y abre el nuevo (prices)
//  - promoción  → solo queda registrada (las promociones del dataset son por categoría, no por producto)
export const aceptar = (id, ajustes = {}) => transaccion(async (client) => {
  const r = await pendiente(client, id);
  const { v, cambio } = aplicar(r, ajustes);

  if (r.tipo === "reposicion") {
    const { rows } = await client.query(
      `SELECT p.supplier_id, p.unit_cost, coalesce(s.standard_lead_time_days, 2) AS entrega
         FROM products p LEFT JOIN suppliers s ON s.supplier_id = p.supplier_id WHERE p.sku = $1`,
      [r.sku]
    );
    const p = rows[0];
    await client.query(
      `INSERT INTO purchase_orders
         (po_id, store_id, supplier_id, sku, order_date, expected_date, qty_ordered, unit_cost, status)
       VALUES ($1,$2,$3,$4,CURRENT_DATE,CURRENT_DATE + $5::int,$6,$7,'In transit')`,
      [`WEB-PO-${Date.now()}-${id}`, r.store_id, p?.supplier_id ?? null, r.sku, p?.entrega ?? 2, v.cantidad, p?.unit_cost ?? null]
    );
  }
  if (r.tipo === "precio") {
    await client.query(
      `UPDATE prices SET effective_to = CURRENT_DATE - 1, last_updated = CURRENT_DATE
        WHERE store_id = $1 AND sku = $2 AND effective_to IS NULL`,
      [r.store_id, r.sku]
    );
    await client.query(
      `INSERT INTO prices (price_id, store_id, sku, unit_price, currency, effective_from, price_list, last_updated)
       VALUES ($1,$2,$3,$4,'USD',CURRENT_DATE,'otzo-web',CURRENT_DATE)`,
      [`WEB-${Date.now()}-${id}`, r.store_id, r.sku, v.precio_propuesto]
    );
  }
  await client.query(
    `UPDATE recomendaciones
        SET estado = 'aceptada', resuelta_en = now(), cantidad = $2, descuento_pct = $3,
            precio_propuesto = $4, editada = editada OR $5
      WHERE id = $1`,
    [id, v.cantidad, v.descuento_pct, v.precio_propuesto, cambio]
  );
  return fila(client, id);
});
