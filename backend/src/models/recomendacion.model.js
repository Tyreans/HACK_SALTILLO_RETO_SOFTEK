import { query, pool } from "../config/db.config.js";
import { ApiError } from "../utils/apiError.js";
import { mkdir, readFile, link, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

export const TIPOS = ["reposicion", "promocion", "precio"];
const ORDENES_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../data/purchase-orders");

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
                          existencia: i.existencia ?? null, sobrante_proyectado: i.sobrante_proyectado ?? null,
                          fecha_inicio: i.fecha_inicio ?? null, fecha_fin: i.fecha_fin ?? null,
                          actualizar_promo_id: i.actualizar_promo_id ?? null }),
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

async function obtenerOrden(client, recomendacionId) {
  const { rows } = await client.query(
    `SELECT po.po_id, po.recommendation_id, po.store_id, po.supplier_id, po.sku,
            p.product_name AS producto, po.order_date::text AS order_date,
            po.expected_date::text AS expected_date, po.qty_ordered,
            po.unit_cost, po.status
       FROM purchase_orders po JOIN products p USING (sku)
      WHERE po.recommendation_id = $1`,
    [recomendacionId]
  );
  return rows[0] ?? null;
}

async function escribirOrdenJson(orden) {
  if (!/^[A-Za-z0-9_-]+$/.test(orden.po_id)) {
    throw new Error(`El identificador ${orden.po_id} no es válido para un archivo de orden.`);
  }
  await mkdir(ORDENES_DIR, { recursive: true });
  const destino = path.join(ORDENES_DIR, `${orden.po_id}.json`);
  const temporal = path.join(ORDENES_DIR, `.${orden.po_id}.${randomUUID()}.tmp`);
  const contenido = `${JSON.stringify(orden, null, 2)}\n`;

  try {
    await writeFile(temporal, contenido, { encoding: "utf8", flag: "wx", mode: 0o600 });
    try {
      await link(temporal, destino);
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      const existente = JSON.parse(await readFile(destino, "utf8"));
      if (existente.po_id !== orden.po_id || existente.recommendation_id !== orden.recommendation_id) {
        throw new Error(`Ya existe un archivo distinto para la orden ${orden.po_id}.`);
      }
    }
  } finally {
    await unlink(temporal).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
  }

  await query(
    "UPDATE purchase_orders SET json_exported_at = coalesce(json_exported_at, now()) WHERE po_id = $1",
    [orden.po_id]
  );
}

async function exportarOrden(client, recomendacionId) {
  const orden = await obtenerOrden(client, recomendacionId);
  if (!orden) throw new Error(`No se encontró la orden para la recomendación ${recomendacionId}.`);
  await escribirOrdenJson(orden);
}

export async function exportarOrdenesPendientes() {
  const { rows } = await query(
    `SELECT po.recommendation_id
       FROM purchase_orders po
      WHERE po.recommendation_id IS NOT NULL AND po.json_exported_at IS NULL
      ORDER BY po.order_date, po.po_id`
  );
  let exportadas = 0;
  for (const row of rows) {
    const client = await pool.connect();
    try {
      await exportarOrden(client, row.recommendation_id);
      exportadas += 1;
    } finally {
      client.release();
    }
  }
  return exportadas;
}

// Aceptar = decisión del gerente + efecto real:
//  - reposición → crea una orden de compra y un JSON recuperable por reintento
//  - precio     → cierra el precio vigente y abre el nuevo (prices)
//  - promoción  → crea la promoción en promotions solo para esa tienda y ese producto, con su vigencia
export async function aceptar(id, ajustes = {}) {
  const resultado = await transaccion(async (client) => {
    const { rows } = await client.query("SELECT * FROM recomendaciones WHERE id = $1 FOR UPDATE", [id]);
    const r = rows[0];
    if (!r) throw new ApiError(404, "Recomendación no encontrada");

    if (r.estado === "aceptada" && r.tipo === "reposicion") {
      const orden = await obtenerOrden(client, id);
      if (!orden) throw new ApiError(500, "La recomendación está aceptada pero no tiene una orden registrada");
      return { recomendacion: await fila(client, id), recomendacionId: id };
    }
    if (r.estado !== "pendiente") throw new ApiError(409, "Esta recomendación ya fue resuelta");

    const { v, cambio } = aplicar(r, ajustes);
    let aplicadoId = null;

    if (r.tipo === "reposicion") {
      const { rows: productos } = await client.query(
        `SELECT p.supplier_id, p.unit_cost, coalesce(s.standard_lead_time_days, 2) AS entrega
           FROM products p LEFT JOIN suppliers s ON s.supplier_id = p.supplier_id WHERE p.sku = $1`,
        [r.sku]
      );
      const producto = productos[0];
      aplicadoId = `OTZO-PO-${id}`;
      await client.query(
        `INSERT INTO purchase_orders
           (po_id, store_id, supplier_id, sku, order_date, expected_date, qty_ordered, unit_cost, status, recommendation_id)
         VALUES ($1,$2,$3,$4,CURRENT_DATE,CURRENT_DATE + $5::int,$6,$7,'In transit',$8)
         ON CONFLICT (recommendation_id) WHERE recommendation_id IS NOT NULL DO NOTHING`,
        [aplicadoId, r.store_id, producto?.supplier_id ?? null, r.sku,
         producto?.entrega ?? 2, v.cantidad, producto?.unit_cost ?? null, id]
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
      const propuesta = typeof r.propuesta_original === "string"
        ? JSON.parse(r.propuesta_original)
        : r.propuesta_original ?? {};
      const promoExistenteId = propuesta.actualizar_promo_id;
      const { rows: datosPromo } = await client.query(
        `SELECT p.unit_cost AS costo, pv.unit_price AS precio, p.discontinued_date::text AS fecha_retiro
           FROM products p
           JOIN v_precio_vigente pv ON pv.sku = p.sku AND pv.store_id = $1
          WHERE p.sku = $2`,
        [r.store_id, r.sku]
      );
      const datos = datosPromo[0];
      if (!datos || !Number.isFinite(datos.precio) || !Number.isFinite(datos.costo)
          || datos.precio <= datos.costo || datos.costo <= 0) {
        throw new ApiError(409, "No se puede activar la promoción: falta precio o costo unitario fiable");
      }
      if (!datos.fecha_retiro || !v.fecha_inicio || !v.fecha_fin
          || v.fecha_inicio >= datos.fecha_retiro || v.fecha_fin < v.fecha_inicio
          || v.fecha_fin >= datos.fecha_retiro) {
        throw new ApiError(409, "La promoción debe iniciar antes de la fecha de retiro del producto");
      }
      const diasRestantes = Math.floor((Date.parse(`${datos.fecha_retiro}T00:00:00Z`) - Date.parse(`${v.fecha_inicio}T00:00:00Z`)) / 86_400_000);
      const precioPromocional = Math.round(datos.precio * (1 - Number(v.descuento_pct) / 100) * 100) / 100;
      if (precioPromocional < datos.costo || (diasRestantes > 7 && precioPromocional <= datos.costo)) {
        throw new ApiError(400, "El descuento no puede dejar el precio por debajo del costo ni eliminar el margen antes de los últimos 7 días");
      }
      v.precio_propuesto = precioPromocional;
      if (promoExistenteId) {
        const { rowCount } = await client.query(
          `UPDATE promotions
              SET discount_pct = $1, end_date = $2, recomendacion_id = $3
            WHERE promo_id = $4 AND store_id = $5 AND sku = $6
              AND CURRENT_DATE BETWEEN start_date AND end_date`,
          [v.descuento_pct, v.fecha_fin, id, promoExistenteId, r.store_id, r.sku]
        );
        if (rowCount !== 1) throw new ApiError(409, "La promoción que se iba a escalar ya no está vigente");
        aplicadoId = promoExistenteId;
      } else {
        aplicadoId = `PR-WEB-${id}`;
        const { rowCount } = await client.query(
          `INSERT INTO promotions (promo_id, promo_name, promo_type, start_date, end_date, discount_pct,
                                   department, category, region_scope, store_id, sku, origen, recomendacion_id)
           SELECT $1, left('Promo ' || p.product_name, 80), 'Percent Off',
                  coalesce($2::date, CURRENT_DATE), $3, $4,
                  p.department, p.category, 'TIENDA', $5, p.sku, $6, $7
             FROM products p WHERE p.sku = $8`,
          [aplicadoId, v.fecha_inicio, v.fecha_fin, v.descuento_pct, r.store_id, r.origen, id, r.sku]
        );
        if (rowCount !== 1) throw new ApiError(404, "No se pudo encontrar el producto para crear la promoción");
      }
      const { rows: fechas } = await client.query(
        "SELECT start_date::text AS i, end_date::text AS f FROM promotions WHERE promo_id = $1",
        [aplicadoId]
      );
      if (!fechas[0]) throw new ApiError(500, "No se pudo recuperar la promoción creada");
      v.fecha_inicio = fechas[0].i;
      v.fecha_fin = fechas[0].f;
    }
    await client.query(
      `UPDATE recomendaciones
          SET estado = 'aceptada', resuelta_en = now(), cantidad = $2, descuento_pct = $3,
              precio_propuesto = $4, editada = editada OR $5,
              fecha_inicio = $6, fecha_fin = $7, aplicado_id = $8
        WHERE id = $1`,
      [id, v.cantidad, v.descuento_pct, v.precio_propuesto, cambio, v.fecha_inicio, v.fecha_fin, aplicadoId]
    );
    return { recomendacion: await fila(client, id), recomendacionId: r.tipo === "reposicion" ? id : null };
  });

  if (resultado.recomendacionId) {
    try {
      const client = await pool.connect();
      try {
        await exportarOrden(client, resultado.recomendacionId);
      } finally {
        client.release();
      }
    } catch (error) {
      throw new ApiError(503, `La recomendación quedó aceptada, pero no se pudo generar el JSON de la orden. Reintenta aceptar para reanudar la exportación. ${error.message}`);
    }
  }
  return resultado.recomendacion;
}
