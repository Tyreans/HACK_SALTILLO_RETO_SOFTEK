-- =====================================================================
-- Otzo – esquema de base de datos para Tiger Cloud (PostgreSQL + TimescaleDB)
-- Se puede volver a correr: borra y recrea todo.
-- Las tablas diarias (ventas, inventario, KPIs, clima) son hypertables
-- particionadas por fecha. En un Postgres sin TimescaleDB se crean como
-- tablas normales y todo sigue funcionando.
-- =====================================================================

DROP VIEW IF EXISTS v_inventario_diario, v_precio_vigente, v_ventas_diarias CASCADE;
DROP TABLE IF EXISTS sales_daily, inventory_daily, purchase_orders, prices, product_barcodes,
  store_daily_kpis, weather_daily, store_closures, promotions, products, stores,
  suppliers, sites, calendar, rechazos CASCADE;

-- --------------------------------------------------------------- catálogos

CREATE TABLE sites (
  site_id       TEXT PRIMARY KEY,
  site_name     TEXT NOT NULL,
  site_type     TEXT NOT NULL,            -- Airport, Rail Station, Bus Terminal, Resort
  region        TEXT NOT NULL,
  traffic_tier  NUMERIC(3,1)               -- tránsito relativo de pasajeros
);

CREATE TABLE suppliers (
  supplier_id              TEXT PRIMARY KEY,
  supplier_name            TEXT NOT NULL,
  category_focus           TEXT,
  standard_lead_time_days  INT,
  contract_fill_rate       NUMERIC(4,3),
  contract_on_time_rate    NUMERIC(4,3),
  min_order_value          NUMERIC(10,2),
  delivery_days            TEXT
);

CREATE TABLE calendar (
  date             DATE PRIMARY KEY,
  day_of_week      TEXT NOT NULL,
  iso_week         INT NOT NULL,
  month            INT NOT NULL,
  year             INT NOT NULL,
  quarter_idx      INT,
  is_weekend       BOOLEAN NOT NULL,
  is_holiday       BOOLEAN NOT NULL,
  holiday_name     TEXT,
  is_school_break  BOOLEAN NOT NULL
);

CREATE TABLE stores (
  store_id       TEXT PRIMARY KEY,
  site_id        TEXT NOT NULL REFERENCES sites,
  store_name     TEXT NOT NULL,
  format         TEXT NOT NULL,           -- Full Counter, Express Kiosk, Shop-in-Shop
  operator_type  TEXT NOT NULL,           -- Owned F&B, Concession Retail
  opening_time   TIME,                    -- 00:00 / 00:00 = 24 h
  closing_time   TIME,
  opened_date    DATE NOT NULL,
  closed_date    DATE,
  sqft           INT,
  seats          INT
);

CREATE TABLE store_closures (
  store_id    TEXT NOT NULL REFERENCES stores,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  reason      TEXT,
  PRIMARY KEY (store_id, start_date)
);

CREATE TABLE products (
  sku                TEXT PRIMARY KEY,
  product_name       TEXT NOT NULL,
  department         TEXT,
  category           TEXT,
  subcategory        TEXT,
  brand              TEXT,
  supplier_id        TEXT REFERENCES suppliers,
  unit_cost          NUMERIC(10,2),
  list_price_base    NUMERIC(10,2),
  case_size          INT,                 -- se pide en múltiplos de esto
  shelf_life_days    INT,
  is_perishable      BOOLEAN,
  storage_type       TEXT,                -- Ambient, Chilled, Frozen
  inventory_tracked  BOOLEAN,
  is_seasonal        BOOLEAN,
  launch_date        DATE,
  discontinued_date  DATE,
  status             TEXT,
  en_catalogo        BOOLEAN NOT NULL DEFAULT TRUE  -- FALSE = SKU que apareció en ventas pero no venía en products.csv
);
CREATE INDEX ON products (department, category);

CREATE TABLE product_barcodes (
  barcode       TEXT PRIMARY KEY,
  sku           TEXT NOT NULL REFERENCES products,
  barcode_type  TEXT
);
CREATE INDEX ON product_barcodes (sku);

CREATE TABLE promotions (
  promo_id             TEXT PRIMARY KEY,
  promo_name           TEXT NOT NULL,
  promo_type           TEXT,
  start_date           DATE NOT NULL,
  end_date             DATE NOT NULL CHECK (end_date >= start_date),
  discount_pct         NUMERIC(5,2),
  department           TEXT,
  category             TEXT,
  region_scope         TEXT,
  expected_uplift_pct  NUMERIC(5,2)
);

CREATE TABLE prices (
  price_id        TEXT PRIMARY KEY,
  store_id        TEXT NOT NULL REFERENCES stores,
  sku             TEXT NOT NULL REFERENCES products,
  unit_price      NUMERIC(10,2) NOT NULL CHECK (unit_price > 0),
  currency        TEXT NOT NULL DEFAULT 'USD',
  effective_from  DATE NOT NULL,
  effective_to    DATE,                   -- NULL = precio vigente
  price_list      TEXT,
  last_updated    DATE
);
CREATE INDEX ON prices (store_id, sku, effective_from DESC);

CREATE TABLE purchase_orders (
  po_id          TEXT PRIMARY KEY,
  store_id       TEXT NOT NULL REFERENCES stores,
  supplier_id    TEXT REFERENCES suppliers,
  sku            TEXT NOT NULL REFERENCES products,
  order_date     DATE NOT NULL,
  expected_date  DATE,
  received_date  DATE,
  qty_ordered    INT NOT NULL CHECK (qty_ordered >= 0),
  qty_received   INT,
  unit_cost      NUMERIC(10,2),
  status         TEXT NOT NULL            -- Delivered, Short-shipped, In transit
);
CREATE INDEX ON purchase_orders (store_id, sku, order_date);
CREATE INDEX ON purchase_orders (supplier_id, order_date);

-- --------------------------------------------------------------- series diarias

CREATE TABLE sales_daily (
  date             DATE NOT NULL REFERENCES calendar,
  store_id         TEXT NOT NULL REFERENCES stores,
  sku              TEXT NOT NULL REFERENCES products,
  units_sold       INT NOT NULL CHECK (units_sold >= 0),
  unit_price       NUMERIC(10,2),
  gross_sales      NUMERIC(12,2) NOT NULL,
  discount_amount  NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_sales        NUMERIC(12,2) NOT NULL,
  promo_id         TEXT REFERENCES promotions,
  PRIMARY KEY (store_id, sku, date)
);

CREATE TABLE inventory_daily (
  date            DATE NOT NULL REFERENCES calendar,
  store_id        TEXT NOT NULL REFERENCES stores,
  sku             TEXT NOT NULL REFERENCES products,
  opening_qty     INT NOT NULL,
  received_qty    INT NOT NULL,
  units_sold      INT NOT NULL,
  expired_qty     INT NOT NULL,          -- merma por caducidad
  damaged_qty     INT NOT NULL,
  closing_qty     INT NOT NULL CHECK (closing_qty >= 0),
  on_order_qty    INT NOT NULL,          -- en tránsito
  stockout_hours  NUMERIC(4,1) NOT NULL CHECK (stockout_hours BETWEEN 0 AND 24),
  PRIMARY KEY (store_id, sku, date)
);

CREATE TABLE store_daily_kpis (
  store_id      TEXT NOT NULL REFERENCES stores,
  date          DATE NOT NULL REFERENCES calendar,
  footfall      INT,
  transactions  INT,
  units_sold    INT,
  net_sales     NUMERIC(12,2),
  staff_hours   NUMERIC(6,1),
  open_hours    NUMERIC(4,1),
  PRIMARY KEY (store_id, date)
);

CREATE TABLE weather_daily (
  site_id     TEXT NOT NULL REFERENCES sites,
  date        DATE NOT NULL REFERENCES calendar,
  temp_max_c  NUMERIC(4,1),
  temp_min_c  NUMERIC(4,1),
  precip_mm   NUMERIC(5,1),
  PRIMARY KEY (site_id, date)
);

-- Filas que el script de limpieza descartó, con el motivo (para auditar)
CREATE TABLE rechazos (
  id      SERIAL PRIMARY KEY,
  tabla   TEXT NOT NULL,
  motivo  TEXT NOT NULL,
  fila    JSONB
);

-- --------------------------------------------------------------- TimescaleDB
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'timescaledb') THEN
    CREATE EXTENSION IF NOT EXISTS timescaledb;
    PERFORM create_hypertable('sales_daily',      'date', chunk_time_interval => INTERVAL '1 month');
    PERFORM create_hypertable('inventory_daily',  'date', chunk_time_interval => INTERVAL '1 month');
    PERFORM create_hypertable('store_daily_kpis', 'date', chunk_time_interval => INTERVAL '3 months');
    PERFORM create_hypertable('weather_daily',    'date', chunk_time_interval => INTERVAL '3 months');
    RAISE NOTICE 'Hypertables creadas';
  ELSE
    RAISE NOTICE 'TimescaleDB no disponible: se usan tablas normales';
  END IF;
END $$;

CREATE INDEX ON sales_daily (date, store_id);
CREATE INDEX ON inventory_daily (date, store_id);
CREATE INDEX ON sales_daily (promo_id) WHERE promo_id IS NOT NULL;

-- --------------------------------------------------------------- vistas útiles

-- Inventario con nombres de producto, tienda y sitio (base para el export a Excel)
CREATE VIEW v_inventario_diario AS
SELECT i.date, i.store_id, s.store_name, si.site_name, si.region,
       i.sku, p.product_name, p.department, p.category, p.is_perishable, p.shelf_life_days,
       i.opening_qty, i.received_qty, i.units_sold, i.expired_qty, i.damaged_qty,
       i.closing_qty, i.on_order_qty, i.stockout_hours,
       ROUND(i.closing_qty * COALESCE(p.unit_cost, 0), 2) AS valor_inventario
FROM inventory_daily i
JOIN stores s   ON s.store_id = i.store_id
JOIN sites si   ON si.site_id = s.site_id
JOIN products p ON p.sku = i.sku;

-- Precio vigente por tienda y SKU
CREATE VIEW v_precio_vigente AS
SELECT DISTINCT ON (store_id, sku) store_id, sku, unit_price, effective_from
FROM prices
WHERE effective_to IS NULL
ORDER BY store_id, sku, effective_from DESC;

-- Ventas con calendario y clima (base para pronóstico y promociones)
CREATE VIEW v_ventas_diarias AS
SELECT v.date, c.day_of_week, c.is_weekend, c.is_holiday, c.holiday_name, c.is_school_break,
       v.store_id, s.format, si.site_id, si.site_type, si.region, si.traffic_tier,
       v.sku, p.department, p.category,
       v.units_sold, v.unit_price, v.gross_sales, v.discount_amount, v.net_sales, v.promo_id,
       w.temp_max_c, w.precip_mm
FROM sales_daily v
JOIN calendar c  ON c.date = v.date
JOIN stores s    ON s.store_id = v.store_id
JOIN sites si    ON si.site_id = s.site_id
JOIN products p  ON p.sku = v.sku
LEFT JOIN weather_daily w ON w.site_id = s.site_id AND w.date = v.date;
