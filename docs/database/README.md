# Database Documentation (`docs/database/`)

## Purpose
This folder contains the database design specifications, Entity-Relationship Diagrams (ERDs), and conventions for the PostgreSQL database.

## Functions & Content
- **Schema Design & ERD:** Documentation of tables, columns, data types, constraints, foreign keys, and indexes.
- **PostgreSQL Conventions:** Naming conventions (snake_case for tables/columns), timestamp tracking (`created_at`, `updated_at`), and UUID/Serial primary key policies.
- **Migration Policy:** Guidelines on creating incremental, reversible schema migrations inside `backend/db/migrations/`.
- **Performance & Indexing:** Indexing strategies for frequent queries, full-text search, or JSONB fields.
- **Security & Permissions:** Documenting the principle of least privilege for the database user, SSL/mTLS requirements, and query parameterization standards.

---

## Esquema Otzo

Definido en [`backend/db/migrations/001_schema_otzo.sql`](../../backend/db/migrations/001_schema_otzo.sql). Funciona en PostgreSQL normal y en Tiger Cloud (ahí las tablas diarias se crean como hypertables de TimescaleDB).

| Tabla | Filas | Llave | Notas |
|---|---:|---|---|
| sites | 20 | site_id | Aeropuertos, estaciones, terminal, resort |
| stores | 38 | store_id | → sites |
| store_closures | 7 | store_id + start_date | Cierres temporales y definitivos |
| suppliers | 8 | supplier_id | Lead time, fill rate, días de entrega |
| products | 1,471 | sku | `en_catalogo = false` para SKUs que solo aparecían en ventas |
| product_barcodes | 1,442 | barcode | → products |
| promotions | 13 | promo_id | |
| calendar | 365 | date | Feriados y vacaciones escolares |
| prices | 2,945 | price_id | `effective_to` NULL = vigente |
| purchase_orders | 262,648 | po_id | |
| sales_daily | 589,132 | store_id + sku + date | hypertable |
| inventory_daily | 493,611 | store_id + sku + date | hypertable |
| store_daily_kpis | 12,784 | store_id + date | hypertable |
| weather_daily | 7,300 | site_id + date | hypertable |
| rechazos | 736 | id | Filas descartadas en la limpieza, con motivo (JSONB) |

Vistas:
- `v_inventario_diario`: inventario + producto + tienda + sitio + valor en USD.
- `v_precio_vigente`: precio actual por tienda y SKU.
- `v_ventas_diarias`: ventas + calendario + clima. Base para el pronóstico de demanda.

Las recomendaciones de promoción usan `products.discontinued_date` como fecha de retiro del almacén. Al aprobar una propuesta inicial se crea una fila de `promotions` por tienda y SKU con `recomendacion_id`; al aprobar una escalada, se actualiza esa misma fila y su `recomendacion_id` apunta a la recomendación de escalamiento. El flujo requiere `backend/db/migrations/004_promociones_aplicadas.sql`; no vuelve a crear tablas ni ejecuta migraciones automáticamente.

La migración `backend/db/migrations/006_backboard_purchase_orders.sql` guarda la asociación tienda→memoria de Backboard y enlaza cada orden aceptada con su recomendación para permitir exportaciones JSON idempotentes. También completa los vínculos antiguos de reposición si `recomendaciones.aplicado_id` coincide de manera inequívoca con un único `purchase_orders.po_id`; los casos ambiguos permanecen sin modificar. Para una base existente, desde `backend/` ejecuta `npm run db:migrar-backboard`; no ejecutes `npm run db:cargar` porque reconstruye el esquema y vuelve a cargar los datos.

## Calidad de datos

`npm run db:limpiar` corrige 47 tipos de problema del dataset (fechas en 3 formatos, IDs mal escritos, duplicados, precios en centavos, inventario que no cuadra, promociones con fechas invertidas, temperaturas -999, etc.). El detalle con conteos está en [`reporte_calidad.md`](reporte_calidad.md).
