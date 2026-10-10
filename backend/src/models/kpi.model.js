import { query } from "../config/db.config.js";

// KPIs diarios de una tienda: tránsito, tickets, ventas y productividad del personal
export async function porTienda({ tienda, desde, hasta }) {
  const { rows } = await query(
    `SELECT k.date AS fecha, c.day_of_week AS dia, c.is_holiday AS feriado,
            k.footfall AS transito, k.transactions AS tickets, k.units_sold AS unidades,
            k.net_sales AS venta_neta, k.staff_hours AS horas_personal, k.open_hours AS horas_abierto,
            round(k.transactions::numeric / NULLIF(k.staff_hours, 0), 2) AS tickets_por_hora_personal,
            round(k.net_sales / NULLIF(k.transactions, 0), 2) AS ticket_promedio,
            round(100.0 * k.transactions / NULLIF(k.footfall, 0), 2) AS pct_conversion
       FROM store_daily_kpis k JOIN calendar c USING (date)
      WHERE k.store_id = $1 AND k.date BETWEEN $2 AND $3
      ORDER BY k.date`,
    [tienda, desde, hasta]
  );
  return rows;
}
