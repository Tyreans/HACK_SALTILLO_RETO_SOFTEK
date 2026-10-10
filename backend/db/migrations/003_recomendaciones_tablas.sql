-- 003: recomendaciones como tablas de varias filas (una por producto)
--      + precios de la competencia. Se puede volver a correr.

ALTER TABLE recomendaciones
  ADD COLUMN IF NOT EXISTS cantidad           INT,            -- re-stock: piezas a pedir
  ADD COLUMN IF NOT EXISTS descuento_pct      NUMERIC(5,2),   -- promoción: % de descuento
  ADD COLUMN IF NOT EXISTS origen             TEXT NOT NULL DEFAULT 'agente'
                                              CHECK (origen IN ('agente', 'gerente')),
  ADD COLUMN IF NOT EXISTS motivo_rechazo     TEXT,
  ADD COLUMN IF NOT EXISTS editada            BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS propuesta_original JSONB;          -- lo que propuso el agente, para aprender

ALTER TABLE recomendaciones ALTER COLUMN titulo DROP NOT NULL;

-- Las tarjetas del formato anterior (una por tipo, sin producto) ya no sirven
DELETE FROM recomendaciones WHERE sku IS NULL;

CREATE INDEX IF NOT EXISTS recomendaciones_tipo_idx ON recomendaciones (store_id, tipo, estado);

-- Precios de la competencia (los carga un script o POST /api/competencia/precios)
CREATE TABLE IF NOT EXISTS precios_competencia (
  id          SERIAL PRIMARY KEY,
  sku         TEXT NOT NULL REFERENCES products,
  competidor  TEXT NOT NULL,
  precio      NUMERIC(10,2) NOT NULL CHECK (precio > 0),
  fecha       DATE NOT NULL DEFAULT CURRENT_DATE,
  fuente      TEXT,                               -- 'scraper', 'manual', 'demo'...
  UNIQUE (sku, competidor, fecha)
);
CREATE INDEX IF NOT EXISTS precios_competencia_sku_idx ON precios_competencia (sku, fecha DESC);
