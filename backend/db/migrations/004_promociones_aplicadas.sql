-- =====================================================================
-- 004 – Al aceptar una recomendación de promoción se crea la promoción real
--
-- * La recomendación de promoción tiene vigencia (fecha_inicio / fecha_fin)
-- * promotions acepta promociones de UNA tienda y UN producto (las del dataset
--   son por departamento/categoría para toda la cadena)
-- * aplicado_id dice qué registro se creó al aceptar (promo, pedido o precio)
--
-- Solo agrega columnas. Se puede correr varias veces. Requiere 002 y 003.
-- =====================================================================

ALTER TABLE recomendaciones
  ADD COLUMN IF NOT EXISTS fecha_inicio DATE,
  ADD COLUMN IF NOT EXISTS fecha_fin    DATE,
  ADD COLUMN IF NOT EXISTS aplicado_id  TEXT;

ALTER TABLE promotions
  ADD COLUMN IF NOT EXISTS store_id         TEXT REFERENCES stores,
  ADD COLUMN IF NOT EXISTS sku              TEXT REFERENCES products,
  ADD COLUMN IF NOT EXISTS origen           TEXT NOT NULL DEFAULT 'dataset',
  ADD COLUMN IF NOT EXISTS recomendacion_id INT REFERENCES recomendaciones ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS promotions_tienda_idx ON promotions (store_id, start_date, end_date);

-- Promociones vigentes por tienda: las propias (store_id) y las de cadena del dataset
-- que le aplican por región ('ALL' o la región del sitio).
CREATE OR REPLACE VIEW v_promociones_tienda AS
SELECT s.store_id, pr.promo_id, pr.promo_name, pr.promo_type, pr.discount_pct,
       pr.start_date, pr.end_date, pr.department, pr.category, pr.sku, p.product_name AS producto,
       pr.origen, pr.recomendacion_id,
       CASE WHEN pr.store_id IS NOT NULL THEN 'tienda' ELSE 'cadena' END AS alcance
  FROM stores s
  JOIN sites si USING (site_id)
  JOIN promotions pr
    ON pr.store_id = s.store_id
    OR (pr.store_id IS NULL AND pr.region_scope IN ('ALL', si.region))
  LEFT JOIN products p ON p.sku = pr.sku;
