import { query, pool } from "../config/db.config.js";
import { ApiError } from "../utils/apiError.js";

export const TIPOS = ["reposicion", "promocion", "precio"];

// Qué campos puede editar el gerente en cada tipo
const CAMPOS_EDITABLES = {
  reposicion: ["cantidad"],
  promocion: ["descuento_pct", "fecha_inicio", "fecha_fin"],
  precio: ["precio"],
};

// Una fila por producto, con el nombre y (si es de precio) lo que cobra la competencia
const SELECT_FILA = `
  SELECT r.id, r.store_id, r.tipo, r.prioridad, r.sku, p.product_name AS producto,
         r.descripcion, r.origen, r.estado, r.editada,
         r.cantidad, r.descuento_pct, r.fecha_inicio::text AS fecha_inicio, r.fecha_fin::text AS fecha_fin,
         r.precio_actual, r.precio_propuesto,
         r.motivo_rechazo, r.propuesta_original, r.aplicado_id, r.creada_en, r.resuelta_en,
         CASE WHEN c.store_id IS NULL THEN NULL
              ELSE json_build_object('promedio', round(c.promedio, 2), 'minimo', c.minimo, 'maximo', c.maximo,
                                     'competidores', c.competidores, 'alcance', c.alcance,
                                     'rival_en_promocion', c.rival_en_promocion)
         END AS competencia
    FROM recomendaciones r
    LEFT JOIN products p ON p.sku = r.sku
    LEFT JOIN v_competencia_tienda c
           ON r.tipo IN ('precio', 'promocion') AND c.store_id = r.store_id AND c.sku = r.sku`;

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
            precio_actual, precio_propuesto, origen, propuesta_original, fecha_inicio, fecha_fin)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'agente',$11,$12,$13)`,
        [tienda, tipo, i.prioridad, i.producto, i.descripcion, i.sku, i.cantidad ?? null,
         i.descuento_pct ?? null, i.precio_actual ?? null, i.precio_propuesto ?? null,
         JSON.stringify({ cantidad: i.cantidad ?? null, descuento_pct: i.descuento_pct ?? null, precio_propuesto: i.precio_propuesto ?? null,
                          fecha_inicio: i.fecha_inicio ?? null, fecha_fin: i.fecha_fin ?? null }),
         i.fecha_inicio ?? null, i.fecha_fin ?? null]
      );
    }
    await client.query("COMMIT");
    return true;
  } catch (e) { await client.query("ROLLBACK"); throw e; } finally { client.release(); }
}

// Opción que agrega el gerente a mano
export async function crearManual({ tienda, tipo, producto, cantidad, descuento_pct, precio, motivo, fecha_inicio, fecha_fin }) {
  const valores = { cantidad: cantidad ?? null, descuento_pct: descuento_pct ?? null, precio_propuesto: precio ?? null,
                    fecha_inicio: fecha_inicio ?? null, fecha_fin: fecha_fin ?? null };
  const dup = await query(
    `SELECT 1 FROM recomendaciones WHERE store_id = $1 AND tipo = $2 AND sku = $3 AND estado = 'pendiente' LIMIT 1`,
    [tienda, tipo, producto.sku]
  );
  if (dup.rowCount) throw new ApiError(409, "Ya hay una recomendación pendiente de este tipo para ese producto");
  const { rows } = await query(
    `INSERT INTO recomendaciones
       (store_id, tipo, prioridad, titulo, descripcion, sku, cantidad, descuento_pct,
        precio_actual, precio_propuesto, origen, propuesta_original, fecha_inicio, fecha_fin)
     VALUES ($1,$2,'media',$3,$4,$5,$6,$7,$8,$9,'gerente',$10,$11,$12) RETURNING id`,
    [tienda, tipo, producto.producto, motivo || "Agregada por el gerente", producto.sku,
     valores.cantidad, valores.descuento_pct, producto.precio ?? null, valores.precio_propuesto, JSON.stringify(valores),
     valores.fecha_inicio, valores.fecha_fin]
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
const comoTexto = (f) => (f == null ? null : f instanceof Date ? f.toISOString().slice(0, 10) : String(f).slice(0, 10));

function aplicar(r, ajustes) {
  const permitidos = CAMPOS_EDITABLES[r.tipo];
  for (const k of Object.keys(ajustes)) {
    if (!permitidos.includes(k)) throw new ApiError(400, `Una recomendación de ${r.tipo} solo admite: ${permitidos.join(", ")}`);
  }
  const v = {
    cantidad: ajustes.cantidad ?? r.cantidad,
    descuento_pct: ajustes.descuento_pct ?? r.descuento_pct,
    precio_propuesto: ajustes.precio ?? r.precio_propuesto,
    fecha_inicio: ajustes.fecha_inicio ?? comoTexto(r.fecha_inicio),
    fecha_fin: ajustes.fecha_fin ?? comoTexto(r.fecha_fin),
  };
  if (v.fecha_inicio && v.fecha_fin && v.fecha_fin < v.fecha_inicio) {
    throw new ApiError(400, "fecha_fin no puede ser anterior a fecha_inicio");
  }
  const cambio = Number(v.cantidad) !== Number(r.cantidad) || Number(v.descuento_pct) !== Number(r.descuento_pct)
    || Number(v.precio_propuesto) !== Number(r.precio_propuesto)
    || v.fecha_inicio !== comoTexto(r.fecha_inicio) || v.fecha_fin !== comoTexto(r.fecha_fin);
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
    `UPDATE recomendaciones SET cantidad = $2, descuento_pct = $3, precio_propuesto = $4, editada = editada OR $5,
            fecha_inicio = $6, fecha_fin = $7
      WHERE id = $1`,
    [id, v.cantidad, v.descuento_pct, v.precio_propuesto, cambio, v.fecha_inicio, v.fecha_fin]
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
//  - promoción  → crea la promoción en promotions solo para esa tienda y ese producto, con su vigencia
export const aceptar = (id, ajustes = {}) => transaccion(async (client) => {
  const r = await pendiente(client, id);
  const { v, cambio } = aplicar(r, ajustes);
  let aplicadoId = null;

  if (r.tipo === "reposicion") {
    const { rows } = await client.query(
      `SELECT p.supplier_id, p.unit_cost, coalesce(s.standard_lead_time_days, 2) AS entrega
         FROM products p LEFT JOIN suppliers s ON s.supplier_id = p.supplier_id WHERE p.sku = $1`,
      [r.sku]
    );
    const p = rows[0];
    aplicadoId = `WEB-PO-${Date.now()}-${id}`;
    await client.query(
      `INSERT INTO purchase_orders
         (po_id, store_id, supplier_id, sku, order_date, expected_date, qty_ordered, unit_cost, status)
       VALUES ($1,$2,$3,$4,CURRENT_DATE,CURRENT_DATE + $5::int,$6,$7,'In transit')`,
      [aplicadoId, r.store_id, p?.supplier_id ?? null, r.sku, p?.entrega ?? 2, v.cantidad, p?.unit_cost ?? null]
    );
  }
  if (r.tipo === "precio") {
    await client.query(
      `UPDATE prices SET effective_to = CURRENT_DATE - 1, last_updated = CURRENT_DATE
        WHERE store_id = $1 AND sku = $2 AND effective_to IS NULL`,
      [r.store_id, r.sku]
    );
    aplicadoId = `WEB-${Date.now()}-${id}`;
    await client.query(
      `INSERT INTO prices (price_id, store_id, sku, unit_price, currency, effective_from, price_list, last_updated)
       VALUES ($1,$2,$3,$4,'USD',CURRENT_DATE,'otzo-web',CURRENT_DATE)`,
      [aplicadoId, r.store_id, r.sku, v.precio_propuesto]
    );
  }
  if (r.tipo === "promocion") {
    if (!v.descuento_pct) throw new ApiError(400, "La promoción no tiene % de descuento");
    aplicadoId = `PR-WEB-${id}`;
    // Sin fechas: empieza hoy y dura 7 días
    await client.query(
      `INSERT INTO promotions (promo_id, promo_name, promo_type, start_date, end_date, discount_pct,
                               department, category, region_scope, store_id, sku, origen, recomendacion_id)
       SELECT $1, left('Promo ' || p.product_name, 80), 'Percent Off',
              coalesce($2::date, CURRENT_DATE), coalesce($3::date, coalesce($2::date, CURRENT_DATE) + 6), $4,
              p.department, p.category, 'TIENDA', $5, p.sku, $6, $7
         FROM products p WHERE p.sku = $8`,
      [aplicadoId, v.fecha_inicio, v.fecha_fin, v.descuento_pct, r.store_id, r.origen, id, r.sku]
    );
    const { rows } = await client.query(`SELECT start_date::text AS i, end_date::text AS f FROM promotions WHERE promo_id = $1`, [aplicadoId]);
    v.fecha_inicio = rows[0].i;
    v.fecha_fin = rows[0].f;
  }
  await client.query(
    `UPDATE recomendaciones
        SET estado = 'aceptada', resuelta_en = now(), cantidad = $2, descuento_pct = $3,
            precio_propuesto = $4, editada = editada OR $5,
            fecha_inicio = $6, fecha_fin = $7, aplicado_id = $8
      WHERE id = $1`,
    [id, v.cantidad, v.descuento_pct, v.precio_propuesto, cambio, v.fecha_inicio, v.fecha_fin, aplicadoId]
  );
  return fila(client, id);
});
