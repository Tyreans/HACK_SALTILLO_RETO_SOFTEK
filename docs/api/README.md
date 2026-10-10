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

> **Documentación interactiva (Swagger):** con el backend corriendo, abre http://localhost:5000/api/docs para ver y probar cada endpoint. La especificación está en `backend/src/config/swagger.config.js`; al crear un endpoint nuevo, agrégalo ahí también. `GET /api` lista todas las rutas registradas.

Base: `http://localhost:5000/api`. Todas las respuestas son `{ success, data, meta? }`; los errores, `{ success: false, error: { message } }`.
Fechas en `YYYY-MM-DD`, tiendas como `S001`. Los datos van de 2025-10-01 a 2026-09-30.

| Método | Ruta | Parámetros | Devuelve |
|---|---|---|---|
| GET | `/health` | – | Estado de la API y la base |
| GET | `/dashboard/:tienda` | `dias` (7), `hasta`, `limite` (3) | Panel izquierdo completo: mejores y peores ventas, estadísticas e inventario bajo, con % vs. periodo anterior |
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

### Dashboard: `GET /api/dashboard/:tienda`

Una sola llamada para todo el panel izquierdo. El periodo son los últimos `dias` días hasta `hasta` (por defecto el último día con datos) y cada indicador se compara contra los `dias` anteriores.

```jsonc
{
  "tienda": { "store_id": "S001", "nombre": "Food Court – Full Counter 1", "sitio": "...", "region": "Northeast" },
  "periodo": { "desde": "2026-09-24", "hasta": "2026-09-30", "dias": 7, "comparado_con": { "desde": "2026-09-17", "hasta": "2026-09-23" } },
  "mejores_ventas": { "venta_total": 4281.55, "unidades": 666, "variacion_pct": 19.6,
                      "productos": [{ "sku": "SKU-100694", "producto": "50 Donut Holes", "unidades": 84, "venta": 1918.2, "variacion_pct": 15.8 }] },
  "peores_ventas":  { "venta_total": 69.33, "unidades": 27, "variacion_pct": 4, "productos": [ ... ] },
  "estadisticas": {
    "ticket_promedio": { "valor": 8.72, "variacion_pct": 1.8 },
    "conversion_pct":  { "valor": 12.2, "variacion_pct": -0.8 },   // tickets / tránsito
    "margen_pct":      { "valor": 76.3, "variacion_pct": -0.1 },   // (venta - costo) / venta
    "merma_pct":       { "valor": 15.7, "variacion_pct": 12.9 },   // caducado / (vendido + caducado)
    "tickets_por_hora_personal": { ... }, "venta_total": { ... }
  },
  "inventario": { "fecha": "2026-09-30", "total_productos": 46, "bajos": 10,
                  "productos": [{ "producto": "Spicy Omlet Flatbread", "estado": "sin_stock", "existencia": 0,
                                  "horas_sin_stock": 18, "venta_diaria": 5.4, "dias_cobertura": 0, "dias_entrega_proveedor": 2 }] }
}
```

`estado` del inventario:
- `sin_stock`: estuvo 2+ horas agotado ese día (venta perdida).
- `bajo`: producto no perecedero cuya existencia + en camino no cubre el tiempo de entrega del proveedor + 1 día.
- `ok`: los perecederos (vida útil ≤ 3 días) que cierran en 0 sin quiebre son normales: se surten diario.

"Retención" del boceto no se puede calcular: el dataset no trae clientes. Se sugiere mostrar `merma_pct` en su lugar.
