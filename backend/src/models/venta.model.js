import { query } from "../config/db.config.js";

export async function rangoFechas() {
  const { rows } = await query(`SELECT min(date) AS desde, max(date) AS hasta FROM sales_daily`);
  return rows[0];
}

// Serie diaria de ventas (una tienda o toda la cadena)
export async function seriePorDia({ desde, hasta, tienda }) {
  const { rows } = await query(
    `SELECT v.date AS fecha, c.day_of_week AS dia, c.is_weekend AS fin_de_semana,
            c.is_holiday AS feriado, c.holiday_name AS nombre_feriado,
            sum(v.units_sold) AS unidades, round(sum(v.net_sales), 2) AS venta_neta,
            round(sum(v.discount_amount), 2) AS descuentos,
            round(sum(v.net_sales) FILTER (WHERE v.promo_id IS NOT NULL), 2) AS venta_con_promo
       FROM sales_daily v JOIN calendar c USING (date)
      WHERE v.date BETWEEN $1 AND $2
        AND ($3::text IS NULL OR v.store_id = $3)
      GROUP BY v.date, c.day_of_week, c.is_weekend, c.is_holiday, c.holiday_name
      ORDER BY v.date`,
    [desde, hasta, tienda ?? null]
  );
  return rows;
}

// Productos más vendidos en un rango
export async function topProductos({ desde, hasta, tienda, limite }) {
  const { rows } = await query(
    `SELECT v.sku, p.product_name AS producto, p.category AS categoria,
            sum(v.units_sold) AS unidades, round(sum(v.net_sales), 2) AS venta_neta
       FROM sales_daily v JOIN products p USING (sku)
      WHERE v.date BETWEEN $1 AND $2
        AND ($3::text IS NULL OR v.store_id = $3)
      GROUP BY v.sku, p.product_name, p.category
      ORDER BY venta_neta DESC
      LIMIT $4`,
    [desde, hasta, tienda ?? null, limite]
  );
  return rows;
}

// Resultado de cada promoción: ventas en su vigencia vs. el uplift esperado
export async function desempenoPromociones() {
  const { rows } = await query(
    `SELECT pr.promo_id, pr.promo_name, pr.promo_type, pr.start_date, pr.end_date,
            pr.discount_pct, pr.department, pr.category, pr.region_scope, pr.expected_uplift_pct,
            count(v.*) AS lineas_vendidas, coalesce(sum(v.units_sold), 0) AS unidades,
            coalesce(round(sum(v.net_sales), 2), 0) AS venta_neta,
            coalesce(round(sum(v.discount_amount), 2), 0) AS descuento_otorgado
       FROM promotions pr LEFT JOIN sales_daily v ON v.promo_id = pr.promo_id
      GROUP BY pr.promo_id
      ORDER BY pr.start_date`
  );
  return rows;
}
