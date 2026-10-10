# 📡 Especificación y Guía de Integración API Otzo – Frontend

> **Base de Integración:** Documento contractual para conectar los componentes de la interfaz de usuario (React + Vite) con la API REST de Express y PostgreSQL.  
> **Servidor Activo:** `http://localhost:3002/api`  
> **Documentación Swagger UI:** `http://localhost:3002/api/docs`  
> **OpenAPI 3 JSON:** `http://localhost:3002/api/docs.json`  

---

## 1. Estado y Verificación de Conexión

- **API REST (Express):** Activa en puerto `3002` (confirmado vía `curl http://localhost:3002/api/`).
- **Base de Datos (PostgreSQL):** Conectada (`/api/health` retorna `{ status: "ok", db: "conectada" }`).
- **Estado de Tablas:** Tablas migradas; pendientes de carga de datos masivos con `npm run db:cargar` en `backend/`.
- **Formato Estándar de Respuesta:** Todas las respuestas de la API siguen el envoltorio JSON:
  ```json
  // Éxito
  {
    "success": true,
    "data": { ... } | [ ... ],
    "meta": { "total": 10, ... } // opcional
  }

  // Error
  {
    "success": false,
    "error": {
      "message": "Descripción detallada del error"
    }
  }
  ```

---

## 2. Catálogo Completo de Endpoints Reconocidos

### 2.1 Salud y Diagnóstico General
| Método | Endpoint | Query / Body | Descripción |
|---|---|---|---|
| `GET` | `/api/` | Ninguno | Retorna el índice del servicio y lista de todos los endpoints disponibles. |
| `GET` | `/api/health` | Ninguno | Verifica conectividad contra el servidor y PostgreSQL (`SELECT 1`). |

---

### 2.2 Dashboard por Sucursal (Panel Secundario: Izquierda)
Este endpoint reúne en **una sola llamada** toda la información necesaria para los paneles flotantes izquierdos de `StoreView`.

- **Ruta:** `GET /api/dashboard/:tienda`
- **Ejemplo:** `GET /api/dashboard/S001?dias=7&limite=3`
- **Parámetros:**
  - `tienda` (*path*, requerido): ID de la sucursal (ej. `S001`, `S003`).
  - `dias` (*query*, opcional, defecto: `7`, rango 1-90): Días a considerar para el cálculo.
  - `hasta` (*query*, opcional, `YYYY-MM-DD`): Fecha límite (defecto: último día con datos).
  - `limite` (*query*, opcional, defecto: `3`, rango 1-20): Cantidad de productos top/bottom.
- **Estructura de Respuesta:**
  ```json
  {
    "success": true,
    "data": {
      "tienda": {
        "store_id": "S001",
        "nombre": "Food Court – Full Counter 1",
        "sitio": "Campus Tech",
        "region": "Northeast"
      },
      "periodo": {
        "desde": "2026-09-24",
        "hasta": "2026-09-30",
        "dias": 7,
        "comparado_con": { "desde": "2026-09-17", "hasta": "2026-09-23" }
      },
      "mejores_ventas": {
        "venta_total": 4281.55,
        "unidades": 666,
        "variacion_pct": 19.6,
        "productos": [
          {
            "sku": "SKU-100694",
            "producto": "50 Donut Holes",
            "categoria": "Bakery",
            "unidades": 84,
            "venta": 1918.20,
            "venta_periodo_anterior": 1656.00,
            "variacion_pct": 15.8
          }
        ]
      },
      "peores_ventas": {
        "venta_total": 69.33,
        "unidades": 27,
        "variacion_pct": -4.2,
        "productos": [
          {
            "sku": "SKU-100010",
            "producto": "Pan Centeno Rebanado",
            "categoria": "Bakery",
            "unidades": 3,
            "venta": 21.00,
            "venta_periodo_anterior": 35.00,
            "variacion_pct": -40.0
          }
        ]
      },
      "estadisticas": {
        "ticket_promedio": { "valor": 8.72, "variacion_pct": 1.8 },
        "conversion_pct": { "valor": 12.2, "variacion_pct": -0.8 },
        "margen_pct": { "valor": 76.3, "variacion_pct": -0.1 },
        "merma_pct": { "valor": 2.1, "variacion_pct": -0.4 },
        "tickets_por_hora_personal": { "valor": 14.5, "variacion_pct": 3.2 },
        "venta_total": { "valor": 4281.55, "variacion_pct": 19.6 }
      },
      "inventario": {
        "fecha": "2026-09-30",
        "total_productos": 140,
        "bajos": 3,
        "productos": [
          {
            "sku": "SKU-100694",
            "producto": "50 Donut Holes",
            "categoria": "Bakery",
            "existencia": 12,
            "en_camino": 0,
            "horas_sin_stock": 2.5,
            "estado": "bajo",
            "bajo": true
          }
        ]
      }
    }
  }
  ```

---

### 2.3 Tiendas y Red de Sucursales (Mapa Principal)
- **`GET /api/tiendas`**:
  - *Query:* `region` (opcional).
  - *Retorna:* Lista completa de sucursales con su latitud/longitud o sitio, formato (`Full Counter`, `Express`), horario y tráfico.
- **`GET /api/tiendas/:id`**:
  - *Retorna:* Datos detallados de la sucursal más historial de `cierres`.
- **`GET /api/tiendas/:id/kpis`**:
  - *Query:* `desde`, `hasta` (opcionales).
  - *Retorna:* Serie diaria de KPIs operativos (tránsito peatonal, tickets generados, conversión, productividad por personal).

---

### 2.4 Motor de Recomendaciones IA (Panel Secundario: Derecha & Modales)
Este módulo alimenta los 3 botones principales: **Reposición**, **Promoción** y **Precios**.

#### A. Obtener Sugerencias
- **Ruta:** `GET /api/recomendaciones/:tienda`
- **Query Params:**
  - `tipo` (opcional): `"reposicion" | "promocion" | "precio"`.
    - Si se envía `tipo`: La API busca las sugerencias guardadas del día; si aún no existen, el agente IA las genera automáticamente y las persiste.
    - Sin `tipo`: Devuelve todas las recomendaciones pendientes de la tienda sin invocar a Gemini.
  - `regenerar` (opcional, `"1"`): Fuerza a la IA a regenerar las sugerencias descartando pendientes anteriores (rate-limit: 10/minuto).
- **Modelo de Respuesta por Fila:**
  ```json
  {
    "id": 14,
    "store_id": "S001",
    "tipo": "precio",
    "prioridad": "alta",
    "sku": "SKU-100694",
    "producto": "50 Donut Holes",
    "descripcion": "Competidor A subió a $24.50. Subir precio captura 12% más de margen sin afectar rotación.",
    "origen": "agente",
    "estado": "pendiente",
    "editada": false,
    "cantidad": null,
    "descuento_pct": null,
    "precio_actual": 21.00,
    "precio_propuesto": 23.50,
    "competencia": {
      "promedio": 24.10,
      "minimo": 23.00,
      "competidores": 3
    },
    "creada_en": "2026-10-10T08:00:00.000Z"
  }
  ```

#### B. Agregar Sugerencia Manual (Botón de Gerente)
- **Ruta:** `POST /api/recomendaciones`
- **Request Body:**
  ```json
  {
    "tienda": "S001",
    "tipo": "reposicion", // "reposicion" | "promocion" | "precio"
    "sku": "SKU-100694",
    "cantidad": 36,        // si tipo == "reposicion"
    "descuento_pct": 15,   // si tipo == "promocion"
    "precio": 22.50,       // si tipo == "precio"
    "motivo": "Incremento de demanda por evento cercano"
  }
  ```
- **Respuesta:** `201 Created` con la nueva recomendación en estado `pendiente` y `origen: "gerente"`.

#### C. Editar Sugerencia Pendiente
- **Ruta:** `PATCH /api/recomendaciones/:id`
- **Request Body (según el tipo):**
  - Reposición: `{ "cantidad": 48 }`
  - Promoción: `{ "descuento_pct": 25 }`
  - Precios: `{ "precio": 23.00 }`

#### D. Aceptar Sugerencia
- **Ruta:** `POST /api/recomendaciones/:id/aceptar`
- **Body Opcional:** Mismo esquema que en editar (permite editar y confirmar en la misma llamada).
- **Acción Backend:**
  - Si es `reposicion`: Crea automáticamente la orden de compra en `purchase_orders` (`In transit`).
  - Si es `precio`: Cierra la vigencia del precio anterior e inserta el nuevo en `prices`.
  - Si es `promocion`: Se marca como aceptada.
  - Se registra el evento en la memoria para retroalimentar el modelo de IA.

#### E. Rechazar Sugerencia
- **Ruta:** `POST /api/recomendaciones/:id/rechazar`
- **Request Body:** `{ "motivo": "Sobreinventario en bodega central" }`
- **Acción Backend:** Guarda el motivo de rechazo y silencia este SKU por 7 días en las recomendaciones automáticas de la IA.

---

### 2.5 Inventario Operativo y Descargas
Alimenta el botón y modal de **Inventario** (`InventoryModal`).

- **`GET /api/inventario`**:
  - *Query:* `tienda=S001`, `fecha=YYYY-MM-DD`, `categoria=Bakery`, `alertas=true`.
  - *Retorna:* Listado de existencias, productos recibidos, mermas (`caducado`, `danado`), cierre de inventario y `horas_sin_stock`.
- **`GET /api/inventario/resumen`**:
  - *Query:* `desde`, `hasta`, `tienda`.
  - *Retorna:* Total vendidos, merma acumulada, % merma y horas sin stock en el rango.
- **`GET /api/inventario/export`**:
  - *Query:* Mismos filtros que `/api/inventario`.
  - *Retorna:* Flujo binario `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (descarga directa de archivo Excel `.xlsx` con hojas de Detalle y Resumen).

---

### 2.6 Productos y Catálogo
- **`GET /api/productos`**: Catálogo paginado con filtros (`q` búsqueda por texto/SKU, `departamento`, `categoria`, `pagina`, `limite`).
- **`GET /api/productos/categorias`**: Resumen de departamentos y categorías con conteo de SKUs.
- **`GET /api/productos/:sku`**: Detalle completo del SKU, códigos de barra y proveedor asociado.

---

### 2.7 Ventas y Promociones
- **`GET /api/ventas/diarias`**: Serie temporal de venta con flag de días feriados y desglose de venta bajo promoción.
- **`GET /api/ventas/top-productos`**: Ranking de productos con mayores ingresos o unidades.
- **`GET /api/promociones`**: Desempeño real de promociones vs. uplift proyectado.

---

### 2.8 Precios de la Competencia
- **`GET /api/competencia/precios?sku=SKU-100694`**: Precios recopilados de competidores rivales.
- **`POST /api/competencia/precios`**: Carga masiva de datos scraping (requiere header `x-admin-key`).

---

### 2.9 Asistente Virtual & IA Chat (Gemini)
El backend cuenta con dos modalidades para el asistente:
1. **Chat de Operaciones Multi-Turno (`POST /api/chat`):**
   - *Payload:* `{ "message": "¿Cuál fue el producto con mayor merma hoy?", "sessionId": "optional-uuid" }`
   - *Respuesta:* `{ "response": "El producto con mayor merma fue...", "sessionId": "..." }`
   - *Reset:* `POST /api/chat/reset` `{ "sessionId": "..." }`
2. **Cajera Virtual Otzo (Respuesta Concisa):**
   - *Payload:* `{ "tienda": "S001", "mensaje": "¿Qué se vendió mejor esta semana?" }`
   - *Respuesta:* `{ "success": true, "data": { "respuesta": "..." } }`
3. **Voz Sintetizada (`POST /api/voz`):**
   - *Payload:* `{ "texto": "Hola, bienvenido a Otzo" }`
   - *Retorna:* Flujo de audio `audio/mpeg` (ElevenLabs con caché en disco local).

---

## 3. Matriz de Mapeo: Frontend ↔ API Backend

| Componente Frontend | Función UI / Evento | Endpoint de API | Payload / Parámetros |
|---|---|---|---|
| `DashboardMap.jsx` | Carga inicial del mapa de sucursales | `GET /api/tiendas` | Ninguno o `?region=...` |
| `StoreView.jsx` | Carga de datos de la sucursal seleccionada | `GET /api/dashboard/:tienda` | `tienda=S001`, `dias=7`, `limite=3` |
| `StoreView.jsx` | Estado del Avatar (`good` vs `bad`) | Derivado de `estadisticas` o `variacion_pct` | Si `venta_total.variacion_pct >= 0` → `good`, sino `bad` |
| `StoreView.jsx` | Tarjeta 1: Mejores Ventas | Extraído de `data.mejores_ventas` | `venta_total`, `unidades`, lista de productos |
| `StoreView.jsx` | Tarjeta 2: Peores Ventas | Extraído de `data.peores_ventas` | `venta_total`, `unidades`, lista de productos |
| `StoreView.jsx` | Tarjeta 3: Rendimiento de Tienda | Extraído de `data.estadisticas` | Ticket prom, conversión, margen, merma |
| `UnifiedSuggestionModal.jsx` | Apertura de modal (Reposición / Promos / Precios) | `GET /api/recomendaciones/:tienda` | `?tipo=reposicion|promocion|precio` |
| `UnifiedSuggestionModal.jsx` | Modificar cantidad, descuento o precio propuesto | `PATCH /api/recomendaciones/:id` | `{ cantidad }` \| `{ descuento_pct }` \| `{ precio }` |
| `UnifiedSuggestionModal.jsx` | Botón "Aceptar sugerencia" | `POST /api/recomendaciones/:id/aceptar` | Mismo cuerpo que en edición si hubo cambios |
| `UnifiedSuggestionModal.jsx` | Botón "Rechazar sugerencia" | `POST /api/recomendaciones/:id/rechazar` | `{ "motivo": "..." }` |
| `ManagerAddRecommendationModal.jsx` | Guardar sugerencia manual del Gerente | `POST /api/recomendaciones` | `{ tienda, tipo, sku, cantidad/descuento/precio, motivo }` |
| `InventoryModal.jsx` | Carga de tabla de inventario | `GET /api/inventario` | `?tienda=S001&alertas=false` |
| `InventoryModal.jsx` | Botón "Descargar Excel" | `GET /api/inventario/export` | `?tienda=S001` (descarga blob `.xlsx`) |
| `InventoryModal.jsx` | Botón "✨ Preguntar a IA" | Abre `ChatDrawer` con contexto de inventario | Query precargado |
| `ChatDrawer.jsx` | Envío de preguntas operativas | `POST /api/chat` | `{ message, sessionId, tienda }` |

---

## 4. Próximos Pasos de Conexión en el Código

1. **Configuración de Variables de Entorno Frontend (`frontend/.env`):**
   - Asegurar `VITE_API_BASE_URL=http://localhost:3002/api` (actualmente apuntaba al puerto 5000 por omisión).
2. **Ajuste de Proxy en `vite.config.js`:**
   - Habilitar proxy hacia `http://localhost:3002` para llamadas relativas `/api/...`.
3. **Normalización en `storeApi.js`:**
   - Consumir el envelope estándar `{ success, data }` (`data` en lugar de `datos`).
   - Mantener los datos locales como fallback de resiliencia si la base de datos aún no tiene registros cargados.
4. **Poblado de Base de Datos:**
   - Ejecutar `npm run db:cargar` en el backend para llenar las tablas con los datos reales del reto.
