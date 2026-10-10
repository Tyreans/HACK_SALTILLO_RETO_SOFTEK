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
| GET | `/recomendaciones/:tienda` | `regenerar=1` | Sugerencias del día del panel derecho (reposición, promoción, precio); ver sección *Recomendaciones, chat y voz* |
| POST | `/recomendaciones/:id/aceptar` | `precio` (cuerpo, opcional) | Acepta la sugerencia; si es de precio, lo aplica en `prices` |
| POST | `/recomendaciones/:id/rechazar` | – | Rechaza la sugerencia |
| PATCH | `/recomendaciones/:id/precio` | `precio` (cuerpo) | Edita el precio propuesto antes de aceptar |
| POST | `/chat` | `tienda`, `mensaje` (cuerpo) | Respuesta corta de la cajera (Gemini) |
| POST | `/voz` | `texto` (cuerpo) | Audio `audio/mpeg` (ElevenLabs) |

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

---

## Recomendaciones, chat y voz (panel derecho y cajera)

Mismo formato de respuesta que el resto (`{ success, data }`) y mismos errores (`{ success: false, error: { message } }`). Las rutas de este bloque **escriben datos o gastan créditos de IA**, así que tienen reglas extra (ver *Límite de peticiones* y *Variables de entorno*).

| Método | Ruta | Cuerpo / parámetros | Devuelve |
|---|---|---|---|
| GET | `/recomendaciones/:tienda` | `regenerar=1` (opcional) | Las sugerencias del día para la tienda (reposición, promoción, cambio de precio) |
| POST | `/recomendaciones/:id/aceptar` | `{ "precio": 2.75 }` (opcional) | La recomendación en estado `aceptada`. Si es de precio, aplica el precio en `prices` |
| POST | `/recomendaciones/:id/rechazar` | – | La recomendación en estado `rechazada` |
| PATCH | `/recomendaciones/:id/precio` | `{ "precio": 2.75 }` | La recomendación con el nuevo `precio_propuesto` (sigue `pendiente`) |
| POST | `/chat` | `{ "tienda": "S001", "mensaje": "..." }` | `{ "respuesta": "..." }` generada con Gemini |
| POST | `/voz` | `{ "texto": "..." }` | Audio **`audio/mpeg`** (no JSON) generado con ElevenLabs |

### `GET /api/recomendaciones/:tienda`

Devuelve las recomendaciones **del día** de la tienda (hasta 3, ordenadas por prioridad). La primera llamada del día las genera y las guarda; las siguientes devuelven las mismas sin gastar Gemini, incluso ya aceptadas o rechazadas, para que el front muestre su estado. Con `?regenerar=1` se descartan las pendientes y se generan de nuevo.

Cómo se generan:
- **Reposición:** productos con `estado` `bajo` o `sin_stock` en el inventario (los mismos del dashboard).
- **Promoción:** los productos de peores ventas de los últimos 7 días.
- **Precio:** se propone al peor vendedor un precio **15 % menor**, sin bajar nunca de **costo + 10 %**. Si no hay forma de bajarlo respetando ese margen, no se genera la tarjeta de precio.
- Los productos y cifras salen siempre de la base de datos. Gemini solo redacta `descripcion` y decide `prioridad`; si falla o contesta algo inválido, se usa un texto de respaldo y el endpoint responde igual.

```jsonc
// GET /api/recomendaciones/S001
{
  "success": true,
  "data": [
    { "id": 12, "store_id": "S001", "tipo": "reposicion", "prioridad": "alta",
      "titulo": "Reposición", "descripcion": "Reponer café espresso y aguacates antes del fin de semana.",
      "sku": null, "precio_actual": null, "precio_propuesto": null,
      "estado": "pendiente", "creada_en": "2026-10-10T15:02:11.000Z", "resuelta_en": null },
    { "id": 13, "store_id": "S001", "tipo": "promocion", "prioridad": "media",
      "titulo": "Promociones", "descripcion": "Ofrecer descuento en té de jazmín y pan de centeno para impulsar rotación.",
      "sku": null, "precio_actual": null, "precio_propuesto": null,
      "estado": "pendiente", "creada_en": "2026-10-10T15:02:11.000Z", "resuelta_en": null },
    { "id": 14, "store_id": "S001", "tipo": "precio", "prioridad": "baja",
      "titulo": "Cambio de precios", "descripcion": "Revisar precio de batido de plátano para mantener margen sin perder competitividad.",
      "sku": "SKU-100694", "precio_actual": 3.5, "precio_propuesto": 2.98,
      "estado": "pendiente", "creada_en": "2026-10-10T15:02:11.000Z", "resuelta_en": null }
  ]
}
```

| Campo | Valores |
|---|---|
| `tipo` | `reposicion`, `promocion`, `precio` |
| `prioridad` | `alta`, `media`, `baja` (la etiqueta de color de cada tarjeta) |
| `estado` | `pendiente`, `aceptada`, `rechazada` |
| `sku`, `precio_actual`, `precio_propuesto` | Solo vienen en `tipo: "precio"`; en las demás son `null` |

### Botones de la tarjeta de precio

| Botón del front | Llamada |
|---|---|
| **Aceptar** | `POST /api/recomendaciones/:id/aceptar` |
| **Editar precio** | `PATCH /api/recomendaciones/:id/precio` con `{ "precio": 2.75 }`; después **Aceptar** |
| **Rechazar** | `POST /api/recomendaciones/:id/rechazar` |

- `aceptar` en una recomendación de **precio** cierra el precio vigente en la tabla `prices` (`effective_to` = ayer) y crea uno nuevo desde hoy con `price_list = 'otzo-web'`. Todo ocurre en una transacción. También acepta `{ "precio": 2.75 }` para editar y aceptar en una sola llamada.
- `aceptar` en reposición o promoción solo cambia el estado a `aceptada`; no modifica nada más.
- Una recomendación ya resuelta no se puede volver a aceptar, rechazar ni editar (`409`).
- `precio` debe ser un número mayor que 0 y hasta 100000; se redondea a 2 decimales.

```js
// Aceptar el precio propuesto
await fetch(`${API}/recomendaciones/${id}/aceptar`, { method: "POST" });

// Editar y luego aceptar
await fetch(`${API}/recomendaciones/${id}/precio`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ precio: 2.75 }),
});
await fetch(`${API}/recomendaciones/${id}/aceptar`, { method: "POST" });
```

### `POST /api/chat`

La cajera responde sobre la tienda usando el resumen del dashboard (últimos 7 días) como contexto. La respuesta es corta (máximo 2 frases) porque está pensada para leerse en voz alta.

```jsonc
// Petición
{ "tienda": "S001", "mensaje": "¿Qué se vendió mejor esta semana?" }
// Respuesta
{ "success": true, "data": { "respuesta": "Lo más vendido fue el café espresso, con 4.8 mil en ventas." } }
```

- `tienda`: formato `S###`, obligatoria.
- `mensaje`: texto de 1 a 300 caracteres.

### `POST /api/voz`

Convierte un texto en voz con ElevenLabs. **La respuesta es un archivo de audio, no JSON**; solo los errores vienen como JSON.

```js
const res = await fetch(`${API}/voz`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ texto: "Hola, soy Otzo." }),
});
if (!res.ok) throw new Error((await res.json()).error.message);
new Audio(URL.createObjectURL(await res.blob())).play();
```

- `texto`: de 1 a 400 caracteres.
- El audio se guarda en una caché en disco: la misma frase con la misma voz no vuelve a gastar créditos (la caché vive en el directorio temporal del contenedor y se pierde al recrearlo).
- Flujo típico de la cajera: `/chat` devuelve `respuesta` y esa misma cadena se envía a `/voz`.

### Límite de peticiones

`/chat` y `/voz` permiten **10 peticiones por minuto por IP**. Al excederlo responden `429`. El contador está en memoria, así que se reinicia con el servidor. Detrás de Caddy funciona porque `app.js` tiene `app.set("trust proxy", 1)`; sin eso todas las peticiones parecerían venir de la misma IP.

### Errores

| Código | Cuándo |
|---|---|
| `400` | Falta o es inválida la tienda, el `id`, el `precio`, el `mensaje` o el `texto` (largo fuera de rango); editar el precio de una recomendación que no es de precio |
| `404` | La tienda o la recomendación no existen |
| `409` | La recomendación ya fue aceptada o rechazada |
| `429` | Más de 10 peticiones por minuto en `/chat` o `/voz` |
| `502` | Gemini o ElevenLabs no respondieron |
| `503` | Falta configurar la llave de Gemini o de ElevenLabs |

`GET /recomendaciones/:tienda` no falla si Gemini cae: devuelve el texto de respaldo.

### Variables de entorno (`backend/.env`)

| Variable | Uso |
|---|---|
| `GEMINI_API_KEY` | Llave de Google AI Studio (recomendaciones y chat) |
| `GEMINI_MODEL` | Modelo de Gemini; por defecto `gemini-2.0-flash`. Verifica que siga disponible |
| `ELEVENLABS_API_KEY` | Llave de ElevenLabs (voz) |
| `ELEVENLABS_VOICE_ID` | Id de la voz de la cajera |
| `ELEVENLABS_MODEL` | Opcional; por defecto `eleven_multilingual_v2` |

Las llaves viven solo en el backend. El frontend nunca debe llamar directo a Gemini ni a ElevenLabs.

### Base de datos

La tabla `recomendaciones` se crea con `backend/db/migrations/002_recomendaciones.sql`. Hay que correrla una vez en cada base (local y Tiger Cloud).

```bash
psql "$DATABASE_URL" -f backend/db/migrations/002_recomendaciones.sql
```
