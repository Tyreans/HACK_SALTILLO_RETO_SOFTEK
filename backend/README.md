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
- Los CSV no se suben al repo (reglas del hackathon); cada quien los copia en `backend/db/datos/`.
- Endpoints: ver [`docs/api/README.md`](../docs/api/README.md). Tablas: ver [`docs/database/README.md`](../docs/database/README.md).
- Requiere Node 18+. `npm run dev` (recarga automática) requiere Node 18.11+.
