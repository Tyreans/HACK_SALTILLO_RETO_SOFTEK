import { query } from "../config/db.config.js";

// Ventas por producto en un periodo, con la comparación contra el periodo anterior.
// orden = 'DESC' para mejores, 'ASC' para peores (solo productos que sí se vendieron).
export async function productosPorVenta({ tienda, desde, hasta, prevDesde, prevHasta, limite, orden }) {
  const direccion = orden === "ASC" ? "ASC" : "DESC";
  const { rows } = await query(
    `WITH actual AS (
       SELECT sku, sum(units_sold) AS unidades, sum(net_sales) AS venta
         FROM sales_daily
        WHERE store_id = $1 AND date BETWEEN $2 AND $3
        GROUP BY sku
       HAVING sum(units_sold) > 0
     ), previo AS (
       SELECT sku, sum(net_sales) AS venta
         FROM sales_daily
        WHERE store_id = $1 AND date BETWEEN $4 AND $5
        GROUP BY sku
     )
     SELECT a.sku, p.product_name AS producto, p.category AS categoria,
            a.unidades, round(a.venta, 2) AS venta,
            round(coalesce(pr.venta, 0), 2) AS venta_periodo_anterior,
            round(100.0 * (a.venta - pr.venta) / NULLIF(pr.venta, 0), 1) AS variacion_pct
       FROM actual a
       JOIN products p USING (sku)
       LEFT JOIN previo pr USING (sku)
      WHERE p.en_catalogo
      ORDER BY a.venta ${direccion}
      LIMIT $6`,
    [tienda, desde, hasta, prevDesde, prevHasta, limite]
  );
  return rows;
}

// Ticket promedio, conversión, margen y merma del periodo y del anterior
export async function estadisticas({ tienda, desde, hasta, prevDesde, prevHasta }) {
  const { rows } = await query(
    `WITH periodos AS (
       SELECT 'actual' AS periodo, $2::date AS d, $3::date AS h
       UNION ALL SELECT 'anterior', $4::date, $5::date
     ),
     k AS (
       SELECT pe.periodo,
              sum(k.net_sales) / NULLIF(sum(k.transactions), 0) AS ticket_promedio,
              100.0 * sum(k.transactions) FILTER (WHERE k.footfall IS NOT NULL)
                    / NULLIF(sum(k.footfall), 0) AS conversion_pct,
              sum(k.transactions)::numeric / NULLIF(sum(k.staff_hours), 0) AS tickets_por_hora_personal,
              sum(k.net_sales) AS venta_total,
              sum(k.transactions) AS tickets
         FROM periodos pe
         JOIN store_daily_kpis k ON k.store_id = $1 AND k.date BETWEEN pe.d AND pe.h
        GROUP BY pe.periodo
     ),
     m AS (
       SELECT pe.periodo,
              100.0 * sum(s.net_sales - s.units_sold * p.unit_cost) / NULLIF(sum(s.net_sales), 0) AS margen_pct
         FROM periodos pe
         JOIN sales_daily s ON s.store_id = $1 AND s.date BETWEEN pe.d AND pe.h
         JOIN products p ON p.sku = s.sku AND p.unit_cost IS NOT NULL
        GROUP BY pe.periodo
     ),
     i AS (
       SELECT pe.periodo,
              100.0 * sum(i.expired_qty) / NULLIF(sum(i.units_sold) + sum(i.expired_qty), 0) AS merma_pct
         FROM periodos pe
         JOIN inventory_daily i ON i.store_id = $1 AND i.date BETWEEN pe.d AND pe.h
        GROUP BY pe.periodo
     )
     SELECT pe.periodo,
            round(k.ticket_promedio, 2) AS ticket_promedio,
            round(k.conversion_pct, 1) AS conversion_pct,
            round(m.margen_pct, 1) AS margen_pct,
            round(i.merma_pct, 1) AS merma_pct,
            round(k.tickets_por_hora_personal, 2) AS tickets_por_hora_personal,
            round(k.venta_total, 2) AS venta_total,
            k.tickets
       FROM periodos pe
       LEFT JOIN k USING (periodo)
       LEFT JOIN m USING (periodo)
       LEFT JOIN i USING (periodo)`,
    [tienda, desde, hasta, prevDesde, prevHasta]
  );
  return Object.fromEntries(rows.map((r) => [r.periodo, r]));
}

// Estado del inventario al cierre de `hasta`: cobertura en días según la venta promedio del periodo.
// - Perecederos (vida útil ≤ 3 días): se surten diario y es normal cerrar en 0;
//   solo son alerta si hubo 2+ horas sin stock (venta perdida).
// - No perecederos: "bajo" si existencia + en camino no alcanza para el tiempo de entrega
//   del proveedor + 1 día de colchón.
export async function inventarioCobertura({ tienda, desde, hasta }) {
  const { rows } = await query(
    `WITH dias AS (SELECT ($3::date - $2::date + 1) AS n),
     venta AS (
       SELECT sku, sum(units_sold)::numeric / (SELECT n FROM dias) AS venta_diaria
         FROM inventory_daily
        WHERE store_id = $1 AND date BETWEEN $2 AND $3
        GROUP BY sku
     )
     SELECT *, (estado <> 'ok') AS bajo
       FROM (
         SELECT i.sku, p.product_name AS producto, p.category AS categoria,
                (coalesce(p.shelf_life_days, 99) <= 3) AS perecedero,
                i.closing_qty AS existencia, i.on_order_qty AS en_camino,
                round(v.venta_diaria, 1) AS venta_diaria,
                round(i.closing_qty / NULLIF(v.venta_diaria, 0), 1) AS dias_cobertura,
                coalesce(su.standard_lead_time_days, 1) AS dias_entrega_proveedor,
                i.stockout_hours AS horas_sin_stock,
                CASE
                  WHEN i.stockout_hours >= 2 THEN 'sin_stock'
                  WHEN coalesce(p.shelf_life_days, 99) > 3
                       AND i.closing_qty + i.on_order_qty < v.venta_diaria * (coalesce(su.standard_lead_time_days, 1) + 1)
                    THEN 'bajo'
                  ELSE 'ok'
                END AS estado
           FROM inventory_daily i
           JOIN products p USING (sku)
           LEFT JOIN suppliers su USING (supplier_id)
           LEFT JOIN venta v USING (sku)
          WHERE i.store_id = $1 AND i.date = $3
       ) x
      ORDER BY CASE estado WHEN 'sin_stock' THEN 0 WHEN 'bajo' THEN 1 ELSE 2 END,
               horas_sin_stock DESC, dias_cobertura ASC NULLS LAST`,
    [tienda, desde, hasta]
  );
  return rows;
}
