import { query } from "../config/db.config.js";

// Consultas que arman la lista de productos candidatos para cada tipo de recomendación.
// Reposición analiza todo el historial; promoción y precios conservan sus ventanas actuales.
const VENTANA = 7;

// Re-stock: existencia, en camino, venta diaria, caja del proveedor y tiempo de entrega
export async function reposicion(tienda, hasta) {
  const { rows } = await query(
    `WITH historico AS (
       SELECT i.sku, c.day_of_week, c.is_weekend, c.is_holiday, c.is_school_break,
              i.units_sold::numeric * 24 / NULLIF(24 - i.stockout_hours, 0) AS demanda
         FROM inventory_daily i
         JOIN calendar c ON c.date = i.date
        WHERE i.store_id = $1 AND i.date <= $2::date AND i.stockout_hours < 24
          AND NOT EXISTS (
            SELECT 1 FROM store_closures sc
             WHERE sc.store_id = i.store_id AND i.date BETWEEN sc.start_date AND sc.end_date
          )
     ),
     promedio AS (
       SELECT sku, avg(demanda) AS venta_diaria, count(*)::int AS dias_historicos
         FROM historico GROUP BY sku
     ),
     perfil AS (
       SELECT sku, day_of_week, is_weekend, is_holiday, is_school_break, avg(demanda) AS venta_diaria
         FROM historico
        GROUP BY sku, day_of_week, is_weekend, is_holiday, is_school_break
     ),
     catalogo AS (
       SELECT p.sku, p.product_name AS producto,
              coalesce(p.is_perishable, false) AS perecedero,
              coalesce(p.shelf_life_days, 30) AS vida_util,
              greatest(coalesce(p.case_size, 1), 1) AS caja,
              coalesce(s.standard_lead_time_days, 2) AS entrega
         FROM products p LEFT JOIN suppliers s ON s.supplier_id = p.supplier_id
        WHERE p.en_catalogo AND p.inventory_tracked IS NOT FALSE AND p.discontinued_date IS NULL
     ),
     existencia AS (
       SELECT DISTINCT ON (sku) sku, date, closing_qty, on_order_qty
         FROM inventory_daily
        WHERE store_id = $1 AND date <= $2::date
        ORDER BY sku, date DESC
     )
     SELECT p.sku, p.producto,
            p.perecedero, p.vida_util, p.caja, p.entrega,
            coalesce(pronostico.venta_diaria, prom.venta_diaria, 0) AS venta_diaria,
            prom.venta_diaria AS venta_diaria_historica,
            prom.dias_historicos, exist.closing_qty AS existencia, exist.on_order_qty AS en_camino,
            pronostico.dias_calendario, pronostico.dias_pronosticados,
            coalesce(pronostico.eventos_calendario, '[]'::json) AS eventos_calendario
       FROM catalogo p
       JOIN promedio prom ON prom.sku = p.sku
       JOIN existencia exist ON exist.sku = p.sku
       LEFT JOIN LATERAL (
         SELECT avg(coalesce(perf.venta_diaria, prom.venta_diaria)) AS venta_diaria,
                count(c.date)::int AS dias_calendario,
                count(*)::int AS dias_pronosticados,
                json_agg(json_build_object(
                  'fecha', c.date,
                  'festivo', c.holiday_name,
                  'vacaciones_escolares', c.is_school_break,
                  'fin_de_semana', c.is_weekend
                ) ORDER BY c.date)
                  FILTER (WHERE c.is_holiday OR c.is_school_break OR c.is_weekend) AS eventos_calendario
           FROM generate_series(
                  ($2::date + 1)::timestamp,
                  ($2::date + p.entrega + CASE WHEN p.perecedero THEN 1 ELSE 3 END)::timestamp,
                  interval '1 day'
                ) AS horizonte(fecha)
           LEFT JOIN calendar c ON c.date = horizonte.fecha::date
           LEFT JOIN perfil perf
             ON perf.sku = p.sku AND perf.day_of_week = c.day_of_week
            AND perf.is_weekend = c.is_weekend AND perf.is_holiday = c.is_holiday
            AND perf.is_school_break = c.is_school_break
       ) pronostico ON true
      WHERE exist.closing_qty IS NOT NULL AND coalesce(pronostico.venta_diaria, prom.venta_diaria) > 0`,
    [tienda, hasta]
  );
  return rows;
}

export async function ultimaFechaInventario(tienda) {
  const { rows } = await query(
    "SELECT max(date)::text AS hasta FROM inventory_daily WHERE store_id = $1",
    [tienda]
  );
  return rows[0]?.hasta ?? null;
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

// Precios: productos de la tienda con precio de competencia. Primero los rivales del mismo
// sitio (base "rivales"); si no hay, el promedio general de precios_competencia.
export async function precios(tienda, hasta) {
  const { rows } = await query(
    `SELECT p.sku, p.product_name AS producto, pv.unit_price AS precio,
            coalesce(p.unit_cost, 0) AS costo,
            c.promedio, c.minimo, c.competidores, c.alcance, c.rival_en_promocion,
            coalesce(v.unidades, 0) AS unidades
       FROM v_precio_vigente pv
       JOIN products p ON p.sku = pv.sku
       JOIN v_competencia_tienda c ON c.store_id = pv.store_id AND c.sku = pv.sku
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
