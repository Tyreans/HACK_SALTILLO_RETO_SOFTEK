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
| GET | `/recomendaciones/:tienda` | `tipo`, `regenerar=1` | Tabla de sugerencias del panel de IA (una fila por producto); ver sección *Panel de IA* |
| POST | `/recomendaciones` | `tienda`, `tipo`, `sku`, valor (cuerpo) | Opción que agrega el gerente a mano |
| PATCH | `/recomendaciones/:id` | `cantidad`, `descuento_pct` o `precio` (cuerpo) | Edita una sugerencia pendiente |
| POST | `/recomendaciones/:id/aceptar` | valor opcional (cuerpo) | Acepta; crea la orden de compra o aplica el precio |
| POST | `/recomendaciones/:id/rechazar` | `motivo` (cuerpo, opcional) | Rechaza; el agente no la repite en 7 días |
| GET | `/competencia/precios` | `sku` | Último precio de cada competidor |
| POST | `/competencia/precios` | header `x-admin-key` + `precios` (cuerpo) | Carga precios de la competencia |
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

## Panel de IA: recomendaciones, competencia, chat y voz

Mismo formato de respuesta que el resto (`{ success, data, meta? }`) y mismos errores (`{ success: false, error: { message } }`). Las rutas de este bloque **escriben datos o gastan créditos de IA**, así que tienen reglas extra (ver *Límite de peticiones* y *Variables de entorno*).

| Método | Ruta | Cuerpo / parámetros | Devuelve |
|---|---|---|---|
| GET | `/recomendaciones/:tienda` | `tipo` (`reposicion`, `promocion`, `precio`), `regenerar=1` | La **tabla** de ese tipo: una fila por producto. Sin `tipo`, solo lo que ya existe hoy (para los contadores de los botones) |
| POST | `/recomendaciones` | `{ tienda, tipo, sku, cantidad \| descuento_pct \| precio, motivo? }` | `201` con la fila que agrega el gerente a mano |
| PATCH | `/recomendaciones/:id` | `{ cantidad }`, `{ descuento_pct }` o `{ precio }` según el tipo | La fila editada (sigue `pendiente`) |
| POST | `/recomendaciones/:id/aceptar` | Opcional: los mismos campos de editar | La fila `aceptada`, con su efecto real (ver abajo) |
| POST | `/recomendaciones/:id/rechazar` | Opcional: `{ motivo }` | La fila `rechazada` |
| GET | `/competencia/precios` | `sku` (opcional) | Último precio de cada competidor |
| POST | `/competencia/precios` | Header `x-admin-key` + `{ precios: [...] }` | Cuántos precios se guardaron |
| POST | `/chat` | `{ tienda, mensaje }` | `{ respuesta }` generada con Gemini |
| POST | `/voz` | `{ texto }` | Audio **`audio/mpeg`** (no JSON) generado con ElevenLabs |

### Cómo funciona el panel: 3 botones, 3 tablas

Cada botón del panel izquierdo (Re-Stock, Promociones, Cambio de precios) abre una tabla con `GET /api/recomendaciones/:tienda?tipo=...`.

- La **primera llamada del día** para una tienda y un tipo calcula las sugerencias y las guarda; las siguientes devuelven lo mismo, ya sea pendiente, aceptado o rechazado, para que la tabla muestre el estado. Con `?regenerar=1` se descartan las pendientes del agente y se calculan de nuevo (tiene límite de peticiones).
- Cada tabla trae **hasta 8 filas**, ordenadas por prioridad, más las opciones que el gerente agregó a mano y dejó pendientes.
- Una tienda sin datos devuelve la tabla vacía (`data: []`), no un error.
- **Los productos y las cifras salen de la base de datos con fórmulas; Gemini solo redacta el motivo** de cada fila. Si Gemini falla o contesta algo inválido, se usa el texto de la regla y el endpoint responde igual.

Reglas (ventana de los últimos 7 días hasta el último día con datos):

| Tipo | Qué propone | Cómo se calcula |
|---|---|---|
| `reposicion` | `cantidad` de piezas a pedir | `venta_diaria × (días de entrega + colchón) × 1.2 − existencia − en camino`. El colchón es 1 día en perecederos y 3 en el resto. Se redondea hacia arriba a cajas completas (`case_size`). En perecederos no se pide más de lo que se alcanza a vender en su vida útil. Prioridad `alta` si la existencia no cubre el tiempo de entrega |
| `promocion` | `descuento_pct` | Perecederos con merma ≥ 10 % de lo disponible (30 % de descuento si la merma es ≥ 25 %, 20 % si no) o con mucha existencia para su vida útil; el resto, con inventario para 10 días o más (10 %) o 21 días o más (15 %). Nunca baja el precio de costo + 5 % |
| `precio` | `precio_propuesto` | Compara con el promedio de la competencia (últimos 30 días). Si cuesta más de 5 % arriba, baja al promedio sin pasar de costo + 15 %. Si cuesta más de 10 % abajo y el producto se vende, sube a 97 % del promedio. Si ningún producto de la tienda tiene precio de competencia, propone −10 % a los de peor venta y lo dice en el motivo |

### Qué aprende el agente de las decisiones del gerente

- **Rechazar:** el producto no se vuelve a sugerir de ese tipo durante 7 días. El `motivo` queda guardado.
- **Editar y aceptar:** si el gerente suele aceptar menos que lo propuesto (por ejemplo 24 en lugar de 42), las siguientes sugerencias de ese producto se ajustan al promedio de sus últimas 3 aceptaciones (entre 0.3× y 1.5× para cantidad, y entre 0.5× y 1.5× para descuento).
- **Aceptado hoy o pendiente a mano:** tampoco se vuelve a sugerir.
- Cada decisión se reporta además a `backend/src/services/memoria.service.js` (`registrarDecision`), que está **vacío a propósito**: ahí se conecta Backboard. La misma función `contexto` devuelve lo que el agente recuerda para incluirlo en el prompt de Gemini.

### Qué pasa al aceptar

| Tipo | Efecto |
|---|---|
| `reposicion` | Crea una orden de compra `In transit` en `purchase_orders` con la cantidad final, el proveedor del producto y la fecha esperada según su tiempo de entrega |
| `precio` | Cierra el precio vigente en `prices` (`effective_to` = ayer) y abre uno nuevo desde hoy con `price_list = 'otzo-web'` |
| `promocion` | Solo queda registrada como aceptada: las promociones del dataset son por categoría, no por producto |

Todo ocurre en una transacción. Una recomendación ya resuelta no se puede volver a aceptar, rechazar ni editar (`409`).

### Una fila de la tabla

```jsonc
// GET /api/recomendaciones/S001?tipo=precio
{
  "success": true,
  "data": [
    { "id": 10, "store_id": "S001", "tipo": "precio", "prioridad": "alta",
      "sku": "SKU-3", "producto": "Batido de plátano",
      "descripcion": "Cuesta 21 % más que el promedio de la competencia ($2.9).",
      "origen": "agente", "estado": "pendiente", "editada": false,
      "cantidad": null, "descuento_pct": null,
      "precio_actual": 3.5, "precio_propuesto": 2.9,
      "competencia": { "promedio": 2.9, "minimo": 2.8, "competidores": 3 },
      "motivo_rechazo": null,
      "propuesta_original": { "cantidad": null, "descuento_pct": null, "precio_propuesto": 2.9 },
      "creada_en": "2026-10-10T15:02:11.000Z", "resuelta_en": null }
  ],
  "meta": { "total": 1 }
}
```

| Campo | Valores |
|---|---|
| `tipo` | `reposicion`, `promocion`, `precio` |
| `prioridad` | `alta`, `media`, `baja` (el color de la etiqueta) |
| `estado` | `pendiente`, `aceptada`, `rechazada` |
| `origen` | `agente` (lo sugirió la IA) o `gerente` (lo agregó él) |
| `editada` | `true` si el gerente cambió el valor que propuso el agente |
| `cantidad` | Solo en `reposicion` |
| `descuento_pct`, `precio_actual` | `descuento_pct` solo en `promocion`; `precio_actual` en `promocion` y `precio` |
| `precio_propuesto`, `competencia` | Solo en `precio` |
| `propuesta_original` | Lo que propuso el agente, antes de que el gerente lo editara |

### Botones de la tabla

| Botón del front | Llamada |
|---|---|
| **Aceptar** | `POST /api/recomendaciones/:id/aceptar` |
| **Editar** | `PATCH /api/recomendaciones/:id` con el campo del tipo; después **Aceptar** (o `aceptar` con ese mismo campo para hacerlo en una llamada) |
| **Rechazar** | `POST /api/recomendaciones/:id/rechazar` con `{ "motivo": "..." }` opcional |
| **Agregar opción** | `POST /api/recomendaciones` |

Cada tipo solo admite su campo: `cantidad` en `reposicion`, `descuento_pct` en `promocion`, `precio` en `precio`. Cualquier otro devuelve `400`. Rangos: `cantidad` entero de 1 a 100000, `descuento_pct` de 1 a 90, `precio` de 0.01 a 100000. `PATCH /recomendaciones/:id/precio` sigue existiendo como alias de la versión anterior.

```js
// Agregar a mano un re-stock que el agente no sugirió
await fetch(`${API}/recomendaciones`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ tienda: "S001", tipo: "reposicion", sku: "SKU-4", cantidad: 24, motivo: "Evento el viernes" }),
});

// Editar la cantidad y aceptar en una sola llamada
await fetch(`${API}/recomendaciones/${id}/aceptar`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ cantidad: 24 }),
});
```

Agregar una opción para un producto que ya tiene una pendiente del mismo tipo devuelve `409`.

### Precios de la competencia

La tabla `precios_competencia` la llena un script o un servicio externo; el panel de precios solo lee.

```bash
# Precios de EJEMPLO (inventados, fuente = 'demo') para probar el panel
npm run db:competencia -- --demo

# Un archivo propio: [{ "sku": "...", "competidor": "...", "precio": 2.9, "fecha"?: "2026-10-10", "fuente"?: "scraper" }]
npm run db:competencia -- precios.json
```

También se pueden cargar por HTTP con `POST /api/competencia/precios` (máximo 1000 por petición). Pide el header `x-admin-key` con el valor de `ADMIN_KEY`; sin esa variable en el servidor, el endpoint responde `503`. Los SKU que no existen en el catálogo se ignoran y se reportan en `ignorados`. Guardar el mismo `sku` + `competidor` + `fecha` actualiza el precio.

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

`/chat`, `/voz` y `GET /recomendaciones/:tienda?regenerar=1` permiten **10 peticiones por minuto por IP** (comparten contador). Al excederlo responden `429`. El contador está en memoria, así que se reinicia con el servidor. Detrás de Caddy funciona porque `app.js` tiene `app.set("trust proxy", 1)`; sin eso todas las peticiones parecerían venir de la misma IP.

### Errores

| Código | Cuándo |
|---|---|
| `400` | Falta o es inválido el `tipo`, la tienda, el `id`, un valor numérico fuera de rango, el `mensaje` o el `texto`; un campo que no corresponde al tipo de la recomendación (por ejemplo `precio` en un re-stock) |
| `401` | `x-admin-key` incorrecta en `POST /competencia/precios` |
| `404` | La tienda, el producto o la recomendación no existen |
| `409` | La recomendación ya fue resuelta, o ya hay una pendiente de ese tipo para ese producto |
| `429` | Más de 10 peticiones por minuto en `/chat`, `/voz` o `GET /recomendaciones/:tienda?regenerar=1` (comparten el mismo contador por IP) |
| `502` | Gemini o ElevenLabs no respondieron |
| `503` | Falta la llave de ElevenLabs (`/voz`) o de Gemini (`/chat`); o falta `ADMIN_KEY` para cargar precios |

`GET /recomendaciones/:tienda` no falla si Gemini cae: devuelve el texto de la regla.

### Variables de entorno (`backend/.env`)

| Variable | Uso |
|---|---|
| `GEMINI_API_KEY` | Llave de Google AI Studio (recomendaciones y chat) |
| `GEMINI_MODEL` | Modelo de Gemini; por defecto `gemini-2.0-flash`. Verifica que siga disponible |
| `ELEVENLABS_API_KEY` | Llave de ElevenLabs (voz) |
| `ELEVENLABS_VOICE_ID` | Id de la voz de la cajera |
| `ELEVENLABS_MODEL` | Opcional; por defecto `eleven_multilingual_v2` |
| `ADMIN_KEY` | Clave para cargar precios de la competencia por HTTP (opcional si se usa el script) |

Las llaves viven solo en el backend. El frontend nunca debe llamar directo a Gemini ni a ElevenLabs.

### Base de datos

Dos migraciones, en orden, una vez por base (local y Tiger Cloud). La 003 se puede volver a correr y borra las tarjetas del formato anterior (las que no tenían producto).

```bash
psql "$DATABASE_URL" -f backend/db/migrations/002_recomendaciones.sql
psql "$DATABASE_URL" -f backend/db/migrations/003_recomendaciones_tablas.sql
```

---

## Promociones que se aplican (migración 004)

Aceptar una recomendación de **promoción** ahora crea la promoción real en `promotions`, solo para esa tienda y ese producto:

- La sugerencia trae `descuento_pct`, `fecha_inicio` y `fecha_fin` (perecederos: 3 días; el resto: 7).
- **Editar** acepta `{ descuento_pct, fecha_inicio, fecha_fin }`; **Agregar** (gerente) también.
- Al **aceptar** se crea `PR-WEB-<id>` y la recomendación guarda `aplicado_id`. Reposición y precio también guardan el id del pedido o precio creado.
- `GET /api/tiendas/S001/promociones?vigentes=1` lista las promociones de la tienda: las propias (`alcance: "tienda"`) y las de cadena del dataset que le aplican (`alcance: "cadena"`).

## Base de rivales (migración 005)

Schema `rivales` en la misma base: se puede borrar y recargar sin tocar lo de Otzo (`DROP SCHEMA rivales CASCADE`).

| Tabla | Qué guarda |
|---|---|
| `rivales.cadenas` | Cadenas competidoras y su posicionamiento (premium, económica, conveniencia) |
| `rivales.tiendas` | Sucursales rivales, cada una en uno de nuestros sitios (`site_id`) |
| `rivales.productos` | Catálogo de cada cadena, ligado a nuestro producto (`sku_equivalente`) |
| `rivales.precios` | Precio por sucursal, producto y fecha; `precio_promo` si estaba en oferta |

- `npm run db:rivales` la llena con datos **de ejemplo ficticios** (3 cadenas, ~45 sucursales, 4 semanas de precios). Se puede correr varias veces. Los datos del scraper van a las mismas tablas con `fuente = 'scraper'` y no se borran.
- La vista `v_competencia_tienda` compara cada tienda contra los rivales **de su mismo sitio**; si no hay, usa `precios_competencia`. La usan las recomendaciones de precio (campo `competencia`, con `alcance: "sitio" | "general"`). Se compara contra el precio **normal** del rival; si alguno está en oferta, se avisa (`rival_en_promocion`).
- `GET /api/competencia/rivales/:tienda`: sucursales rivales del sitio.
- `GET /api/competencia/comparar/:tienda?q=donut`: nuestro precio vs. cada rival, por producto.
- El **chatbot** tiene dos herramientas nuevas: `comparar_con_rivales` y `listar_rivales`. Ejemplo: *"¿Qué productos de S001 están más caros que los rivales?"*.

> `npm run db:cargar` ahora aplica todas las migraciones (002 a 005) automáticamente. Después: `npm run db:rivales` y, si quieren, `npm run db:competencia -- --demo`.

---

## Avatar: estado de ánimo de la tienda

`GET /api/dashboard/:tienda/animo` (también viene como `animo` dentro de `GET /api/dashboard/:tienda`)

```jsonc
{
  "estado": "triste",                // feliz | triste
  "puntaje": 45,                     // 0–100 (null si está cerrada)
  "cerrada": false,                  // true si la tienda no operó (sale triste)
  "mensaje": "Semana difícil: hay 20 de 35 productos sin stock o bajos. Revisa las recomendaciones.",
  "principal_problema": "faltantes", // ventas | merma | faltantes | null
  "factores": [
    { "clave": "ventas",    "peso": 45, "valor": -4.9, "puntaje": 34, "texto": "Ventas -4.9 % vs. la semana anterior" },
    { "clave": "merma",     "peso": 30, "valor": 7.7,  "puntaje": 100, "texto": "Se tiró el 7.7 % por caducidad" },
    { "clave": "faltantes", "peso": 25, "valor": 57.1, "puntaje": 0,   "texto": "20 de 35 productos sin stock o bajos" }
  ]
}
```

- **Puntaje** = ventas vs. semana anterior (45 %) + merma (30 %) + productos sin stock o bajos (25 %).
- **Solo dos estados:** `feliz` si el puntaje es ≥ 50, `triste` si es menor. Una tienda que cerró o no vendió en el periodo sale `triste` con `cerrada: true`.
- En el front basta con: `animo.estado === "feliz" ? <AvatarFeliz/> : <AvatarTriste/>`.
- `mensaje` es una frase lista para que la cajera la diga: se puede mandar a `POST /api/voz`.
- `?dias=30` lo calcula sobre el último mes.

`GET /api/dashboard/animo` devuelve el estado de **todas** las tiendas (de peor a mejor) para colorear los pines del mapa. Se guarda 10 minutos en memoria.
