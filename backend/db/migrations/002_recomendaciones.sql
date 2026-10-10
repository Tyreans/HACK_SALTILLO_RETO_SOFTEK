CREATE TABLE IF NOT EXISTS recomendaciones (
  id                SERIAL PRIMARY KEY,
  store_id          TEXT NOT NULL REFERENCES stores,
  tipo              TEXT NOT NULL CHECK (tipo IN ('reposicion','promocion','precio')),
  prioridad         TEXT NOT NULL CHECK (prioridad IN ('alta','media','baja')),
  titulo            TEXT NOT NULL,
  descripcion       TEXT NOT NULL,
  sku               TEXT REFERENCES products,
  precio_actual     NUMERIC(10,2),
  precio_propuesto  NUMERIC(10,2),
  estado            TEXT NOT NULL DEFAULT 'pendiente'
                    CHECK (estado IN ('pendiente','aceptada','rechazada')),
  creada_en         TIMESTAMPTZ NOT NULL DEFAULT now(),
  resuelta_en       TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS recomendaciones_tienda_idx ON recomendaciones (store_id, creada_en DESC);
