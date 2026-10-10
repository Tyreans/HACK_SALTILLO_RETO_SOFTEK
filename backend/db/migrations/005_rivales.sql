-- =====================================================================
-- 005 – Base de datos de tiendas rivales (schema "rivales")
--
-- Vive aparte de las tablas de Otzo: se puede borrar y recargar sin tocar
-- nada más (DROP SCHEMA rivales CASCADE). Se llena con:
--     npm run db:rivales            (datos de ejemplo, ficticios)
-- o con datos reales que traiga el scraper.
--
-- Las recomendaciones de precio y el chatbot leen de aquí a través de la
-- vista public.v_competencia_tienda.
-- =====================================================================

CREATE SCHEMA IF NOT EXISTS rivales;

-- Cadenas competidoras (ficticias en la demo)
CREATE TABLE IF NOT EXISTS rivales.cadenas (
  cadena_id      TEXT PRIMARY KEY,
  nombre         TEXT NOT NULL,
  posicionamiento TEXT NOT NULL CHECK (posicionamiento IN ('premium', 'economica', 'conveniencia')),
  descripcion    TEXT
);

-- Sucursales rivales: cada una está en uno de nuestros sitios (mismo aeropuerto/estación)
CREATE TABLE IF NOT EXISTS rivales.tiendas (
  tienda_id  TEXT PRIMARY KEY,
  cadena_id  TEXT NOT NULL REFERENCES rivales.cadenas ON DELETE CASCADE,
  site_id    TEXT NOT NULL REFERENCES public.sites,
  nombre     TEXT NOT NULL,
  ubicacion  TEXT                                -- p. ej. "Terminal B, junto a la puerta 12"
);
CREATE INDEX IF NOT EXISTS rivales_tiendas_sitio_idx ON rivales.tiendas (site_id);

-- Catálogo de cada cadena, ligado a nuestro producto equivalente
CREATE TABLE IF NOT EXISTS rivales.productos (
  producto_id      TEXT PRIMARY KEY,
  cadena_id        TEXT NOT NULL REFERENCES rivales.cadenas ON DELETE CASCADE,
  nombre           TEXT NOT NULL,
  categoria        TEXT,
  sku_equivalente  TEXT REFERENCES public.products   -- con qué producto de Otzo compite
);
CREATE INDEX IF NOT EXISTS rivales_productos_sku_idx ON rivales.productos (sku_equivalente);

-- Precio observado de un producto en una sucursal rival en una fecha
CREATE TABLE IF NOT EXISTS rivales.precios (
  tienda_id     TEXT NOT NULL REFERENCES rivales.tiendas ON DELETE CASCADE,
  producto_id   TEXT NOT NULL REFERENCES rivales.productos ON DELETE CASCADE,
  fecha         DATE NOT NULL,
  precio        NUMERIC(10,2) NOT NULL CHECK (precio > 0),
  precio_promo  NUMERIC(10,2) CHECK (precio_promo IS NULL OR precio_promo > 0),   -- si estaba en promoción
  fuente        TEXT,                                                              -- 'demo', 'scraper', 'manual'
  PRIMARY KEY (tienda_id, producto_id, fecha)
);
CREATE INDEX IF NOT EXISTS rivales_precios_fecha_idx ON rivales.precios (fecha);

-- ---------------------------------------------------------------------
-- Comparación por tienda de Otzo y producto, con la última semana de precios.
-- Se compara contra el precio NORMAL del rival (una promoción temporal no debe
-- arrastrar nuestro precio); rival_en_promocion avisa si alguno está en oferta.
--   1. Rivales del MISMO sitio (alcance = 'sitio'), que es lo que ve el viajero.
--   2. Si no hay rivales en ese sitio, el promedio general de precios_competencia
--      (alcance = 'general'), que es lo que ya cargaba db:competencia.
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_competencia_tienda AS
WITH ultima AS (SELECT max(fecha) AS f FROM rivales.precios),
sitio AS (
  SELECT s.store_id, rp.sku_equivalente AS sku,
         avg(p.precio)                             AS promedio,
         min(p.precio)                             AS minimo,
         max(p.precio)                             AS maximo,
         count(DISTINCT p.tienda_id)::int          AS competidores,
         bool_or(p.precio_promo IS NOT NULL)       AS rival_en_promocion,
         'sitio'::text                              AS alcance
    FROM public.stores s
    JOIN rivales.tiendas t   ON t.site_id = s.site_id
    JOIN rivales.precios p   ON p.tienda_id = t.tienda_id
    JOIN rivales.productos rp ON rp.producto_id = p.producto_id
   WHERE rp.sku_equivalente IS NOT NULL
     AND p.fecha > (SELECT f FROM ultima) - 7
   GROUP BY s.store_id, rp.sku_equivalente
),
general AS (
  SELECT s.store_id, pc.sku,
         avg(pc.precio) AS promedio, min(pc.precio) AS minimo, max(pc.precio) AS maximo,
         count(DISTINCT pc.competidor)::int AS competidores,
         false AS rival_en_promocion,
         'general'::text AS alcance
    FROM public.precios_competencia pc
    CROSS JOIN public.stores s
   WHERE pc.fecha >= CURRENT_DATE - 30
   GROUP BY s.store_id, pc.sku
)
SELECT * FROM sitio
UNION ALL
SELECT g.* FROM general g
 WHERE NOT EXISTS (SELECT 1 FROM sitio x WHERE x.store_id = g.store_id AND x.sku = g.sku);
