CREATE TABLE IF NOT EXISTS backboard_store_memory (
  store_id     TEXT PRIMARY KEY REFERENCES stores ON DELETE CASCADE,
  assistant_id TEXT NOT NULL,
  thread_id    TEXT NOT NULL UNIQUE,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS recommendation_id INT REFERENCES recomendaciones(id),
  ADD COLUMN IF NOT EXISTS json_exported_at TIMESTAMPTZ;

WITH coincidencias AS (
  SELECT r.id AS recommendation_id,
         po.po_id,
         count(*) OVER (PARTITION BY r.id) AS por_recomendacion,
         count(*) OVER (PARTITION BY po.po_id) AS por_orden
    FROM recomendaciones r
    JOIN purchase_orders po ON po.po_id = r.aplicado_id
   WHERE r.tipo = 'reposicion'
     AND r.estado = 'aceptada'
     AND po.recommendation_id IS NULL
),
inequivocas AS (
  SELECT recommendation_id, po_id
    FROM coincidencias
   WHERE por_recomendacion = 1 AND por_orden = 1
)
UPDATE purchase_orders po
   SET recommendation_id = i.recommendation_id
  FROM inequivocas i
 WHERE po.po_id = i.po_id
   AND po.recommendation_id IS NULL
   AND NOT EXISTS (
     SELECT 1
       FROM purchase_orders existente
      WHERE existente.recommendation_id = i.recommendation_id
   );

CREATE UNIQUE INDEX IF NOT EXISTS purchase_orders_recommendation_uidx
  ON purchase_orders (recommendation_id)
  WHERE recommendation_id IS NOT NULL;
