import { query } from "../config/db.config.js";

// Consultas que arman la lista de productos candidatos para cada tipo de recomendación.

// Re-stock: existencia, en camino, venta diaria, caja del proveedor y tiempo de entrega
export async function reposicion(tienda, hasta) {
  const { rows } = await query(
    `WITH historico AS (
       SELECT i.sku,
              coalesce(c.day_of_week, (ARRAY['Mon','Tue','Wed','Thu','Fri','Sat','Sun'])[extract(isodow FROM i.date)::int]) AS day_of_week,
              coalesce(c.is_weekend, extract(isodow FROM i.date) IN (6, 7)) AS is_weekend,
              coalesce(c.is_holiday, false) AS is_holiday,
              coalesce(c.is_school_break, false) AS is_school_break,
              c.holiday_name,
              i.units_sold::numeric * 24 / NULLIF(24 - i.stockout_hours, 0) AS demanda
         FROM inventory_daily i
         LEFT JOIN calendar c ON c.date = i.date
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
     perfil_feriado AS (
       SELECT sku, day_of_week, holiday_name, avg(demanda) AS venta_diaria
         FROM historico
        WHERE is_holiday
        GROUP BY sku, day_of_week, holiday_name
     ),
     perfil_semana AS (
       SELECT sku, day_of_week, avg(demanda) AS venta_diaria
         FROM historico GROUP BY sku, day_of_week
     ),
     catalogo AS (
       SELECT p.sku, p.product_name AS producto,
              coalesce(p.is_perishable, false) AS perecedero,
              coalesce(p.shelf_life_days, 30) AS vida_util,
              greatest(coalesce(p.case_size, 1), 1) AS caja,
              p.discontinued_date,
              coalesce(s.standard_lead_time_days, 2) AS entrega
         FROM products p LEFT JOIN suppliers s ON s.supplier_id = p.supplier_id
        WHERE p.en_catalogo AND p.inventory_tracked IS NOT FALSE
     ),
     existencia AS (
       SELECT DISTINCT ON (sku) sku, date, closing_qty, on_order_qty
         FROM inventory_daily
        WHERE store_id = $1 AND date <= $2::date
        ORDER BY sku, date DESC
     )
     SELECT p.sku, p.producto,
            p.perecedero, p.vida_util, p.caja, p.entrega, p.discontinued_date,
            coalesce(pronostico.venta_diaria, prom.venta_diaria, 0) AS venta_diaria,
            prom.venta_diaria AS venta_diaria_historica,
            prom.dias_historicos, exist.closing_qty AS existencia, exist.on_order_qty AS en_camino,
            pronostico.dias_calendario, pronostico.dias_pronosticados,
            coalesce(pronostico.eventos_calendario, '[]'::json) AS eventos_calendario
       FROM catalogo p
       JOIN promedio prom ON prom.sku = p.sku
       JOIN existencia exist ON exist.sku = p.sku
       LEFT JOIN LATERAL (
         SELECT avg(coalesce(
                  pf.venta_diaria,
                  perf.venta_diaria,
                  ps.venta_diaria,
                  prom.venta_diaria
                )) AS venta_diaria,
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
           LEFT JOIN perfil_feriado pf
             ON pf.sku = p.sku AND coalesce(c.is_holiday, false)
            AND pf.day_of_week = coalesce(c.day_of_week, (ARRAY['Mon','Tue','Wed','Thu','Fri','Sat','Sun'])[extract(isodow FROM horizonte.fecha)::int])
            AND (pf.holiday_name IS NOT DISTINCT FROM c.holiday_name)
           LEFT JOIN perfil perf
             ON perf.sku = p.sku AND perf.day_of_week = coalesce(c.day_of_week, (ARRAY['Mon','Tue','Wed','Thu','Fri','Sat','Sun'])[extract(isodow FROM horizonte.fecha)::int])
            AND perf.is_weekend = coalesce(c.is_weekend, extract(isodow FROM horizonte.fecha) IN (6, 7))
            AND perf.is_holiday = coalesce(c.is_holiday, false)
            AND perf.is_school_break = coalesce(c.is_school_break, false)
           LEFT JOIN perfil_semana ps
             ON ps.sku = p.sku AND ps.day_of_week = coalesce(c.day_of_week, (ARRAY['Mon','Tue','Wed','Thu','Fri','Sat','Sun'])[extract(isodow FROM horizonte.fecha)::int])
       ) pronostico ON true
      WHERE exist.closing_qty IS NOT NULL
        AND coalesce(pronostico.venta_diaria, prom.venta_diaria) > 0
        AND (p.discontinued_date IS NULL OR p.discontinued_date >
             $2::date + p.entrega + CASE WHEN p.perecedero THEN 1 ELSE 3 END)`,
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

// Promociones: demanda proyectada antes de la fecha de retiro del almacén.
export async function promocion(tienda) {
  const { rows } = await query(
    `WITH historico AS (
       SELECT i.sku,
              coalesce(c.day_of_week, (ARRAY['Mon','Tue','Wed','Thu','Fri','Sat','Sun'])[extract(isodow FROM i.date)::int]) AS day_of_week,
              coalesce(c.is_weekend, extract(isodow FROM i.date) IN (6, 7)) AS is_weekend,
              coalesce(c.is_holiday, false) AS is_holiday,
              coalesce(c.is_school_break, false) AS is_school_break,
              c.holiday_name,
              i.units_sold::numeric * 24 / NULLIF(24 - i.stockout_hours, 0) AS demanda
         FROM inventory_daily i
         LEFT JOIN calendar c ON c.date = i.date
        WHERE i.store_id = $1 AND i.date <= CURRENT_DATE AND i.stockout_hours < 24
          AND NOT EXISTS (
            SELECT 1 FROM store_closures sc
             WHERE sc.store_id = i.store_id AND i.date BETWEEN sc.start_date AND sc.end_date
          )
     ),
     promedio AS (
       SELECT sku, avg(demanda) AS venta_diaria
         FROM historico GROUP BY sku
     ),
     perfil AS (
       SELECT sku, day_of_week, is_weekend, is_holiday, is_school_break, avg(demanda) AS venta_diaria
         FROM historico
        GROUP BY sku, day_of_week, is_weekend, is_holiday, is_school_break
     ),
     perfil_feriado AS (
       SELECT sku, day_of_week, holiday_name, avg(demanda) AS venta_diaria
         FROM historico
        WHERE is_holiday
        GROUP BY sku, day_of_week, holiday_name
     ),
     perfil_semana AS (
       SELECT sku, day_of_week, avg(demanda) AS venta_diaria
         FROM historico GROUP BY sku, day_of_week
     ),
     catalogo AS (
       SELECT p.sku, p.product_name AS producto, p.unit_cost AS costo, p.discontinued_date
         FROM products p
        WHERE p.en_catalogo AND p.inventory_tracked IS NOT FALSE
          AND p.discontinued_date > CURRENT_DATE
          AND p.discontinued_date <= CURRENT_DATE + 14
          AND p.unit_cost > 0
     ),
     existencia_base AS (
       SELECT DISTINCT ON (i.sku)
              i.sku, i.date AS inventario_fecha, i.closing_qty, i.on_order_qty
         FROM inventory_daily i
        WHERE i.store_id = $1 AND i.date <= CURRENT_DATE
        ORDER BY i.sku, i.date DESC
     )
     SELECT p.sku, p.producto, p.costo, pv.unit_price AS precio,
            p.discontinued_date::text AS fecha_retiro,
            CURRENT_DATE::text AS fecha_calculo,
            (p.discontinued_date - CURRENT_DATE)::int AS dias_retiro,
            inv.inventario_fecha::text AS fecha_inventario,
            greatest(inv.closing_qty + coalesce(inv.on_order_qty, 0) - coalesce(pasado.venta_proyectada, 0), 0)::int AS existencia,
            coalesce(pasado.dias_calendario, 0)::int AS dias_calendario_pasado,
            coalesce(pasado.dias_pronosticados, 0)::int AS dias_pasados,
            coalesce(futuro.venta_diaria, prom.venta_diaria, 0) AS venta_diaria,
            coalesce(futuro.venta_proyectada, 0) AS venta_proyectada,
            greatest(
              greatest(inv.closing_qty + coalesce(inv.on_order_qty, 0) - coalesce(pasado.venta_proyectada, 0), 0)
                - coalesce(futuro.venta_proyectada, 0),
              0
            )::int AS sobrante_proyectado,
            coalesce(futuro.dias_calendario, 0)::int AS dias_calendario_futuro,
            coalesce(futuro.dias_pronosticados, 0)::int AS dias_futuros,
            active.promo_id AS promocion_activa_id,
            active.discount_pct AS descuento_activo,
            active.recomendacion_id AS promocion_activa_recomendacion_id
       FROM catalogo p
       JOIN existencia_base inv ON inv.sku = p.sku
       JOIN v_precio_vigente pv ON pv.store_id = $1 AND pv.sku = p.sku
       JOIN promedio prom ON prom.sku = p.sku
       LEFT JOIN LATERAL (
         SELECT sum(coalesce(pf.venta_diaria, perf.venta_diaria, ps.venta_diaria, prom.venta_diaria)) AS venta_proyectada,
                count(c.date)::int AS dias_calendario,
                count(*)::int AS dias_pronosticados
           FROM generate_series(
                  (inv.inventario_fecha + 1)::timestamp,
                  least(CURRENT_DATE, p.discontinued_date - 1)::timestamp,
                  interval '1 day'
                ) AS horizonte(fecha)
           LEFT JOIN calendar c ON c.date = horizonte.fecha::date
           LEFT JOIN perfil_feriado pf
             ON pf.sku = p.sku AND coalesce(c.is_holiday, false)
            AND pf.day_of_week = coalesce(c.day_of_week, (ARRAY['Mon','Tue','Wed','Thu','Fri','Sat','Sun'])[extract(isodow FROM horizonte.fecha)::int])
            AND pf.holiday_name IS NOT DISTINCT FROM c.holiday_name
           LEFT JOIN perfil perf
             ON perf.sku = p.sku AND perf.day_of_week = coalesce(c.day_of_week, (ARRAY['Mon','Tue','Wed','Thu','Fri','Sat','Sun'])[extract(isodow FROM horizonte.fecha)::int])
            AND perf.is_weekend = coalesce(c.is_weekend, extract(isodow FROM horizonte.fecha) IN (6, 7))
            AND perf.is_holiday = coalesce(c.is_holiday, false)
            AND perf.is_school_break = coalesce(c.is_school_break, false)
           LEFT JOIN perfil_semana ps
             ON ps.sku = p.sku AND ps.day_of_week = coalesce(c.day_of_week, (ARRAY['Mon','Tue','Wed','Thu','Fri','Sat','Sun'])[extract(isodow FROM horizonte.fecha)::int])
          WHERE inv.inventario_fecha < CURRENT_DATE
       ) pasado ON true
       LEFT JOIN LATERAL (
         SELECT avg(coalesce(pf.venta_diaria, perf.venta_diaria, ps.venta_diaria, prom.venta_diaria)) AS venta_diaria,
                sum(coalesce(pf.venta_diaria, perf.venta_diaria, ps.venta_diaria, prom.venta_diaria)) AS venta_proyectada,
                count(c.date)::int AS dias_calendario,
                count(*)::int AS dias_pronosticados
           FROM generate_series(
                  (CURRENT_DATE + 1)::timestamp,
                  (p.discontinued_date - 1)::timestamp,
                  interval '1 day'
                ) AS horizonte(fecha)
           LEFT JOIN calendar c ON c.date = horizonte.fecha::date
           LEFT JOIN perfil_feriado pf
             ON pf.sku = p.sku AND coalesce(c.is_holiday, false)
            AND pf.day_of_week = coalesce(c.day_of_week, (ARRAY['Mon','Tue','Wed','Thu','Fri','Sat','Sun'])[extract(isodow FROM horizonte.fecha)::int])
            AND pf.holiday_name IS NOT DISTINCT FROM c.holiday_name
           LEFT JOIN perfil perf
             ON perf.sku = p.sku AND perf.day_of_week = coalesce(c.day_of_week, (ARRAY['Mon','Tue','Wed','Thu','Fri','Sat','Sun'])[extract(isodow FROM horizonte.fecha)::int])
            AND perf.is_weekend = coalesce(c.is_weekend, extract(isodow FROM horizonte.fecha) IN (6, 7))
            AND perf.is_holiday = coalesce(c.is_holiday, false)
            AND perf.is_school_break = coalesce(c.is_school_break, false)
           LEFT JOIN perfil_semana ps
             ON ps.sku = p.sku AND ps.day_of_week = coalesce(c.day_of_week, (ARRAY['Mon','Tue','Wed','Thu','Fri','Sat','Sun'])[extract(isodow FROM horizonte.fecha)::int])
       ) futuro ON true
       LEFT JOIN LATERAL (
         SELECT pr.promo_id, pr.discount_pct, pr.recomendacion_id
           FROM promotions pr
          WHERE pr.store_id = $1 AND pr.sku = p.sku
            AND CURRENT_DATE BETWEEN pr.start_date AND pr.end_date
          ORDER BY pr.start_date DESC, pr.promo_id
          LIMIT 1
       ) active ON true
      WHERE inv.closing_qty + coalesce(inv.on_order_qty, 0) > 0
        AND greatest(inv.closing_qty + coalesce(inv.on_order_qty, 0) - coalesce(pasado.venta_proyectada, 0), 0) > 0
        AND greatest(
              greatest(inv.closing_qty + coalesce(inv.on_order_qty, 0) - coalesce(pasado.venta_proyectada, 0), 0)
                - coalesce(futuro.venta_proyectada, 0),
              0
            ) > 0
        AND pv.unit_price > p.costo
      ORDER BY p.discontinued_date, p.sku`,
    [tienda]
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
