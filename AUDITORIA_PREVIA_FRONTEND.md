# Auditoría Final Previa al Desarrollo del Frontend

**Documento:** Checklist de Verificación y Diagnóstico Integral del Backend  
**Proyecto:** Otzo – Tienda Inteligente  
**Fecha:** Octubre 2026  
**Objetivo:** Identificar bloqueadores, discrepancias de ramas y contratos de API antes de iniciar el Frontend.

---

## 🚨 1. Hallazgos Críticos y Bloqueadores Inmediatos

Antes de escribir una sola línea de código en el Frontend, existen **3 situaciones críticas en el repositorio** que deben resolverse:

### A. Estado de Git y Ramas Desincronizadas
- La copia local actual en `main` se encuentra **19 commits por detrás de `origin/main`** (se realizaron merges recientes de las ramas `RaMarko` y `RaMaik2`).
- En la rama local actual, varias carpetas de `backend/src/` aparecen vacías debido a que no se ha ejecutado `git pull`.
- **Acción requerida (cuando decidan actualizar):**
  ```bash
  git pull origin main
  ```

---

### B. Bug Fatal en `backend/src/routes/index.js` en `origin/main` (El servidor no arrancará)
Al revisar el código fusionado en `origin/main`, se detectó un **error de importación que provocará un `ReferenceError` fatal al arrancar Node.js**:

1. **Imports faltantes en la cabecera:**
   En el commit `46e3d9e`, al agregar `import chatRoutes from "./chat.routes.js";`, se **eliminaron accidentalmente** las siguientes importaciones esenciales:
   ```javascript
   import * as Recs from "../controllers/recomendacion.controller.js";
   import * as Asistente from "../controllers/asistente.controller.js";
   import * as Competencia from "../controllers/competencia.controller.js";
   import { limitar, limitarSi, requiereClaveAdmin } from "../middlewares/rateLimit.middleware.js";
   ```
2. **Consecuencia:**
   En las líneas 56 a 70 de `routes/index.js`, el código intenta usar `limitar(...)`, `Recs.listar`, `Competencia.listar`, etc. Al no estar declarados, Node.js se detendrá en seco con:
   ```
   ReferenceError: limitar is not defined
   ```
3. **Colisión de rutas en `/api/chat`:**
   En `origin/main`, el router tiene dos declaraciones superpuestas:
   - Línea 33: `router.use("/chat", chatRoutes);` (el nuevo chatbot con herramientas de BD).
   - Línea 69: `router.post("/chat", limiteIA, Asistente.chat);` (el chatbot anterior de la cajera).
   Al estar montado primero `chatRoutes`, la ruta de la línea 69 queda sombreada/inaccesible.

---

### C. Archivo de Entorno `backend/.env` Inexistente
- En el disco **no existe el archivo `backend/.env`** (únicamente está `backend/.env.example`).
- El archivo [`backend/src/config/env.config.js`](file:///home/tyreans/hacktec/backend/src/config/env.config.js) tiene una validación estricta de arranque:
  ```javascript
  const requeridas = ["DATABASE_URL"];
  if (faltantes.length) { process.exit(1); }
  ```
- **Acción requerida:** Crear `backend/.env` copiando de `.env.example` y configurando `DATABASE_URL` y `GEMINI_API_KEY`.

---

## 🎨 2. Estado Actual de la Carpeta `frontend/`

- En `frontend/` **aún no hay un proyecto React inicializado**:
  - No existe `package.json`, `vite.config.js` ni `src/App.jsx`.
  - Solo existen carpetas estructuradas con archivos `README.md` y un archivo [`frontend/public/index.html`](file:///home/tyreans/hacktec/frontend/public/index.html) que contiene una interfaz web de prueba en HTML/JS vanilla para el chatbot.
- **Para arrancar el frontend en React/Vite:**
  El equipo necesitará inicializar el proyecto en la carpeta `frontend/` (ej. con Vite) o crear el `package.json` con React y dependencias (Tailwind/Lucide/Leaflet/Axios).

---

## 📡 3. Catálogo de Contratos de la API para el Frontend

Toda la API responde en formato estándar:
- **Éxito:** `{ "success": true, "data": <resultado>, "meta": { ... } }`
- **Error:** `{ "success": false, "error": { "message": "Descripción del error" } }`

### 🗺️ A. Tiendas y Navegación
| Método | Endpoint | Parámetros | Uso en Frontend |
|---|---|---|---|
| `GET` | `/api/tiendas` | `?region=Northeast` (opcional) | Lista de 38 tiendas con su ID (`S001`), nombre y datos de sitio. Para el mapa, asignar coordenadas estáticas por sitio. |
| `GET` | `/api/tiendas/:id` | `id` en path (ej. `S001`) | Detalle específico de la tienda y sus cierres temporales. |
| `GET` | `/api/tiendas/:id/kpis` | `?desde=YYYY-MM-DD&hasta=YYYY-MM-DD` | KPIs históricos diarios (tránsito, tickets, ticket promedio, conversión). |

---

### 📊 B. Dashboard de Sucursal (Los 4 Paneles y el Avatar)
| Método | Endpoint | Parámetros | Uso en Frontend |
|---|---|---|---|
| `GET` | `/api/dashboard/:tienda` | Path: `:tienda` (ej. `S001`)<br>Query: `?dias=7&hasta=2026-09-30&limite=3` | **Resuelve todos los paneles de la tienda en 1 sola llamada:**<br>1. `mejores_ventas`: Top productos vendidos.<br>2. `peores_ventas`: Productos de menor rotación.<br>3. `estadisticas`: Margen %, merma %, ticket promedio, conversión.<br>4. `inventario`: Total de productos y alertas.<br>5. Base para calcular la animación del **Avatar** según variación de venta/merma. |

---

### 📦 C. Inventario y Reportes
| Método | Endpoint | Parámetros | Uso en Frontend |
|---|---|---|---|
| `GET` | `/api/inventario` | `?tienda=S001&fecha=YYYY-MM-DD&categoria=Bakery&alertas=true` | Llena la tabla completa del **Popup de Inventario** con existencias, caducados, dañados y quiebres. |
| `GET` | `/api/inventario/export` | Mismos filtros que `/inventario` | Descarga el archivo **.xlsx** generado por el servidor. |

---

### 🤖 D. Asistencia con IA (Panel Izquierdo: Re-Stock, Promociones, Precios)
| Método | Endpoint | Payload / Query | Reglas Estrictas para el Frontend |
|---|---|---|---|
| `GET` | `/api/recomendaciones/:tienda` | `?tipo=reposicion` \| `promocion` \| `precio`<br>`?regenerar=1` (opcional) | **Obligatorio pasar `?tipo=`** para que se generen las filas del día. Si no se pasa `tipo`, devuelve lista vacía `[]`. |
| `POST` | `/api/recomendaciones/:id/aceptar` | Body opcional: `{ "cantidad": 20 }` (solo el campo del tipo) o `{}` vacío si no se editó | Aplica la sugerencia: crea orden de compra en tránsito o actualiza precio en la base de datos. |
| `POST` | `/api/recomendaciones/:id/rechazar` | Body opcional: `{ "motivo": "Texto breve" }` | Rechaza la sugerencia. **Nota:** el agente no volverá a sugerir ese SKU por 7 días. |
| `PATCH` | `/api/recomendaciones/:id` | Body: `{ "cantidad": 25 }` (reposición)<br>`{ "descuento_pct": 15 }` (promoción)<br>`{ "precio": 3.9 }` (precio) | Modifica el valor propuesto sin aceptarla aún. **Solo enviar el campo correspondiente al tipo.** |
| `POST` | `/api/recomendaciones` | Body: `{ "tienda": "S001", "tipo": "reposicion", "sku": "SKU-100694", "cantidad": 30, "motivo": "..." }` | Botón **"+ Agregar sugerencia"** del gerente. El `sku` debe ir en mayúsculas. |

---

### 💬 E. Chatbot Inteligente con Acceso a Base de Datos
En `origin/main`, el nuevo servicio de chat está montado en `/api/chat`:
| Método | Endpoint | Body | Respuesta |
|---|---|---|---|
| `POST` | `/api/chat` | `{ "message": "¿Cuáles productos tienen mayor merma?", "sessionId": "opcional" }` | `{ "response": "Texto de respuesta analítica", "sessionId": "123456" }` |
| `POST` | `/api/chat/reset` | `{ "sessionId": "123456" }` | `{ "success": true }` |

---

## 🛠️ 4. Checklist Paso a Paso antes de Empezar el Frontend

1. [ ] **Resolver la rama en Git:**
   - Hacer `git pull origin main` para tener el código más reciente.
2. [ ] **Corregir el archivo `backend/src/routes/index.js`:**
   - Restaurar los `import` de `Recs`, `Competencia`, `Asistente` y `rateLimit.middleware.js` para evitar el crash del servidor.
   - Definir si `/api/chat` usará el nuevo chatbot inteligente (`chatRoutes`) o el de la cajera (`Asistente.chat`).
3. [ ] **Crear `backend/.env`:**
   - Copiar de `backend/.env.example` y configurar `DATABASE_URL` y `GEMINI_API_KEY`.
4. [ ] **Poblar datos de competencia:**
   - Correr `npm run db:competencia -- --demo` en el backend para que la pestaña de cambio de precios muestre datos.
5. [ ] **Inicializar el entorno Frontend:**
   - Crear el `package.json` de frontend con Vite/React y configurar la conexión base a `http://localhost:5000/api`.
