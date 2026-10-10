import { query } from "../config/db.config.js";

export async function listar({ texto, departamento, categoria, limite, offset }) {
  const params = [texto ? `%${texto}%` : null, departamento ?? null, categoria ?? null, limite, offset];
  const filtro = `
     WHERE en_catalogo
       AND ($1::text IS NULL OR product_name ILIKE $1 OR sku ILIKE $1)
       AND ($2::text IS NULL OR department = $2)
       AND ($3::text IS NULL OR category = $3)`;
  const [{ rows }, total] = await Promise.all([
    query(
      `SELECT sku, product_name, department, category, subcategory, supplier_id,
              unit_cost, list_price_base, case_size, shelf_life_days, is_perishable,
              storage_type, inventory_tracked, status
         FROM products ${filtro}
        ORDER BY department, category, product_name
        LIMIT $4 OFFSET $5`,
      params
    ),
    query(`SELECT count(*) AS n FROM products ${filtro}`, params.slice(0, 3)),
  ]);
  return { filas: rows, total: total.rows[0].n };
}

export async function obtener(sku) {
  const { rows } = await query(
    `SELECT p.*, s.supplier_name, s.standard_lead_time_days
       FROM products p LEFT JOIN suppliers s USING (supplier_id)
      WHERE p.sku = $1`,
    [sku]
  );
  return rows[0] ?? null;
}

export async function categorias() {
  const { rows } = await query(
    `SELECT department, category, count(*) AS productos
       FROM products WHERE en_catalogo
      GROUP BY department, category ORDER BY department, category`
  );
  return rows;
}
