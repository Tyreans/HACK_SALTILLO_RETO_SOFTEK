# Backend Application (`backend/`)

## Overview
This directory contains the Express.js server, representing the REST API backend of the project. It connects to a PostgreSQL database and handles external AI processing via the Google Gemini API.

## Core Technologies
- **Express.js:** Web server framework for routing, middlewares, and controllers.
- **PostgreSQL:** Relational database management system accessed via parameterized client queries (e.g. `pg` / `knex` / `prisma` / `typeorm`).
- **Google Gemini API:** AI capabilities accessed securely server-side using `@google/genai` or `@google/generative-ai`.
- **Dotenv:** Environment variable management loaded from `.env`.

## Folder Organization
- [`src/`](file:///home/tyreans/hacktec/backend/src/README.md): Main application source code.
  - [`src/config/`](file:///home/tyreans/hacktec/backend/src/config/README.md): Configuration modules (PostgreSQL, Gemini API client, env validation).
  - [`src/controllers/`](file:///home/tyreans/hacktec/backend/src/controllers/README.md): HTTP request and response handlers.
  - [`src/middlewares/`](file:///home/tyreans/hacktec/backend/src/middlewares/README.md): Express middlewares (auth, validation, error handler, rate limit).
  - [`src/models/`](file:///home/tyreans/hacktec/backend/src/models/README.md): Data access layers, queries, and PostgreSQL models.
  - [`src/routes/`](file:///home/tyreans/hacktec/backend/src/routes/README.md): Express router declarations and endpoint routing.
  - [`src/services/`](file:///home/tyreans/hacktec/backend/src/services/README.md): Business logic and external service integrations (Gemini AI service).
  - [`src/utils/`](file:///home/tyreans/hacktec/backend/src/utils/README.md): Shared helper utilities and formatters.
- [`db/`](file:///home/tyreans/hacktec/backend/db/README.md): Database migration scripts and initial seeds for PostgreSQL.

## Environment Setup
Copy the example environment file and populate values:
```bash
cp .env.example .env
```
Ensure valid PostgreSQL credentials and a valid `GEMINI_API_KEY` are provided before starting the server.

## Puesta en marcha (Otzo)

```bash
cd backend
npm install
cp .env.example .env          # pon tu DATABASE_URL (local o Tiger)
# copia los 14 CSV del hackathon a backend/db/datos/
npm run db:limpiar            # corrige el dataset -> db/datos_limpios/ + reporte_calidad.md
npm run db:cargar             # crea tablas (db/migrations/001_schema_otzo.sql) y carga ~1.3 M filas
npm start                     # API en http://localhost:5000/api; chat en http://localhost:5000
```

- En desarrollo, `npm run dev` inicia el mismo servidor con recarga automática. Abre `http://localhost:5000` para usar el chat.
- El chat consulta Gemini y puede usar herramientas de solo lectura para ventas, inventario, productos y tiendas. No ejecuta SQL generado por el modelo. Ejemplos: “¿Qué productos vendieron más?”, “¿Qué alertas de inventario hay?” o “Resume las ventas por tienda”.
- Cuando el usuario solicite una lista o cantidad, o la respuesta incluya varios elementos, el asistente los devuelve enumerados, uno por renglón.
- Añade `BACKBOARD_API_KEY` a `backend/.env` para habilitar memoria persistente por tienda. La clave nunca debe estar en el frontend ni en Git. Aplica la migración sin borrar la base existente con `npm run db:migrar-backboard` (no uses `npm run db:cargar` sobre una base que quieras conservar). La migración rellena `purchase_orders.recommendation_id` para órdenes antiguas cuya recomendación de reposición las identifica inequívocamente mediante `recomendaciones.aplicado_id`.
- Para comprobar enlaces faltantes o ambiguos después de migrar, ejecuta en PostgreSQL:
  ```sql
  SELECT r.id AS recommendation_id, r.aplicado_id, count(po.po_id) AS ordenes_coincidentes
  FROM recomendaciones r
  LEFT JOIN purchase_orders po ON po.po_id = r.aplicado_id
  WHERE r.tipo = 'reposicion' AND r.estado = 'aceptada'
    AND (po.recommendation_id IS NULL OR po.recommendation_id <> r.id)
  GROUP BY r.id, r.aplicado_id;
  ```
  Las coincidencias no inequívocas no se enlazan automáticamente; revísalas antes de corregirlas manualmente.
- Para generar las recomendaciones diarias de reposición y promociones, ejecuta desde `backend/`:
  ```bash
  npm run recomendaciones:generar
  ```
  Opcionalmente se puede limitar a una tienda: `npm run recomendaciones:generar -- --tienda S001`. El comando procesa las tiendas abiertas en secuencia y reintenta exportar las órdenes aceptadas cuyo JSON aún esté pendiente. `npm run recomendaciones:reposicion` se conserva como alias compatible. El cron debe invocarlo una vez al día; este repositorio no crea ni programa ese cron.
- Las promociones se basan en `products.discontinued_date` (fecha de retiro del almacén, no caducidad): detectan inventario proyectado sin vender, recomiendan descuentos escalonados de 10/20/30 % a partir de los 14 días previos y una escalada si queda inventario durante los últimos 7 días. Requieren aprobación del gerente, actualizan la promoción vigente al escalar y nunca fijan el precio por debajo del costo. Si faltan precio o costo fiables, se omite la propuesta.
- Al aceptar una reposición, el backend registra una sola orden por recomendación y escribe un archivo idempotente `backend/data/purchase-orders/<po_id>.json`. Si falla la escritura, la API lo informa y se puede reintentar; el siguiente comando diario también repara exportaciones pendientes. La carpeta generada está excluida de Git.
- Los CSV no se suben al repo (reglas del hackathon); cada quien los copia en `backend/db/datos/`.
- Endpoints: ver [`docs/api/README.md`](../docs/api/README.md). Tablas: ver [`docs/database/README.md`](../docs/database/README.md).
- Requiere Node 18+. `npm run dev` (recarga automática) requiere Node 18.11+.
