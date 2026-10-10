# API Documentation (`docs/api/`)

## Purpose
This folder contains REST API endpoint specifications, payloads, response formats, and error code references.

## Key Sections to Document
- **Authentication & Headers:** Token formats (e.g. Bearer JWT / Cookies), CSRF requirements, and CORS restrictions.
- **Endpoint Catalog:** Grouped by resources (e.g., `/api/auth`, `/api/users`, `/api/gemini`, `/api/items`).
- **Request & Response Contracts:** JSON schemas, query parameter definitions, and validation rules.
- **Error Handling:** Standardized error responses (e.g., status codes `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `429 Too Many Requests`, `500 Internal Server Error`).
- **Gemini AI Endpoints:** Specifications for prompt submissions, streaming responses, and token usage limits.

---

## Catálogo de endpoints (Otzo)

Base: `http://localhost:5000/api`. Todas las respuestas son `{ success, data, meta? }`; los errores, `{ success: false, error: { message } }`.
Fechas en `YYYY-MM-DD`, tiendas como `S001`. Los datos van de 2025-10-01 a 2026-09-30.

| Método | Ruta | Parámetros | Devuelve |
|---|---|---|---|
| GET | `/health` | – | Estado de la API y la base |
| GET | `/tiendas` | `region` | Tiendas con su sitio, formato y horario |
| GET | `/tiendas/:id` | – | Detalle de una tienda + cierres temporales |
| GET | `/tiendas/:id/kpis` | `desde`, `hasta` | Tránsito, tickets, venta, horas de personal, ticket promedio, % conversión por día |
| GET | `/productos` | `q`, `departamento`, `categoria`, `pagina`, `limite` | Catálogo paginado (`meta.total`) |
| GET | `/productos/categorias` | – | Departamentos y categorías con conteo |
| GET | `/productos/:sku` | – | Detalle del producto y su proveedor |
| GET | `/inventario` | `tienda`, `fecha`, `categoria`, `alertas=true` | Movimiento de inventario del día (sin `fecha` = último día) |
| GET | `/inventario/resumen` | `desde`, `hasta`, `tienda` | Vendidos, merma, % merma y horas sin stock por tienda |
| GET | `/inventario/export` | mismos que `/inventario` | Archivo **.xlsx** (hoja de detalle + resumen por tienda) |
| GET | `/ventas/diarias` | `tienda`, `desde`, `hasta` | Serie diaria con feriados y venta con promo (default: últimos 30 días) |
| GET | `/ventas/top-productos` | `tienda`, `desde`, `hasta`, `limite` | Productos más vendidos |
| GET | `/promociones` | – | Cada promoción con unidades, venta y descuento otorgado vs. uplift esperado |

### Ejemplos

```
GET /api/inventario?tienda=S001&alertas=true
GET /api/inventario/resumen?desde=2026-09-01&hasta=2026-09-30
GET /api/ventas/diarias?tienda=S029&desde=2025-12-15&hasta=2026-01-05
```

Descargar el Excel desde React:

```js
const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/inventario/export?tienda=S001`);
const blob = await res.blob();
const nombre = res.headers.get("Content-Disposition").match(/filename="(.+)"/)[1];
const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: nombre });
a.click();
```
