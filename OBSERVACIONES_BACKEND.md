# Plan de Adecuación Backend (Prototipo 24 Horas)
**Proyecto:** Otzo – Tienda Inteligente (Gestión de Inventario y Red de Sucursales)  
**Contexto:** Hackathon / Sprint MVP (24 Horas)  
**Documento:** Reestructuración de Requerimientos, Alcance y Recomendaciones para el Equipo  

---

## 1. Visión y Estrategia del Prototipo (MVP 24h)

El objetivo para este prototipo de 24 horas es **demostrar el flujo de valor crítico y la interactividad con IA**, reduciendo la fricción en componentes secundarios o de infraestructura pesada. 

El backend actual (`otzo-backend`) ya cuenta con el **80% del motor transaccional y analítico más complejo** (cálculo de cobertura, mermas por caducidad, órdenes de compra en PostgreSQL, actualización de precios y aprendizaje matemático por SQL). La estrategia consiste en:
1. **Aprovechar al máximo lo que ya funciona.**
2. **Reemplazar con placeholders o mocks visuales lo secundario** (alta de tiendas, ranking global de tiendas).
3. **Potenciar el chatbot con Gemini** dándole acceso analítico a la base de datos para responder sobre cualquier producto o inventario.
4. **Separar claramente la navegación** entre Dashboard General (Mapa) y Detalle de Sucursal (`?id=S001`).

---

## 2. Matriz de Requerimientos: Alcance 24h vs. Fase 2

| Módulo / Requerimiento | Alcance 24 Horas (Hackathon MVP) | Alcance Producción (Fase 2) |
|---|---|---|
| **Mapa y Sucursales** | Mapa interactivo con las 38 sucursales ubicadas mediante diccionario estático de coordenadas (lat/lng mock/real). | Tabla de sucursales con coordenadas dinámicas en PostgreSQL (`GIS / PostGIS`). |
| **Agregar Tienda** | Botón visual en UI con modal *"Función disponible en la siguiente versión"* o alta mock. Sin backend. | Endpoint `POST /api/tiendas` con persistencia en BD y geocodificación automática. |
| **Paneles: Tienda + / - productiva** | Placeholders con diseño final en el Dashboard General. | Query agregado multi-tienda en base a `store_daily_kpis` en tiempo real. |
| **Navegación / URLs** | URL principal para el Mapa (`/`) y URL con parámetro para sucursal (`/sucursal?id=S001` o `/?id=S001`). | Rutas RESTful `/tiendas/:id` con state manager centralizado. |
| **Barra de Búsqueda** | Selector rápido de tiendas para redirigir a `?id=#` y acceso directo al chatbot. | Búsqueda global full-text indexing (Elasticsearch / pg_trgm) con autocompletado. |
| **Memoria del Negocio (Backboard)** | **Fuera de alcance.** El aprendizaje se apoya en PostgreSQL (`factoresAprendidos` y rechazos en `recomendacion.model.js`). | Integración completa de la API de Backboard en `memoria.service.js`. |
| **Avatar de Rendimiento** | Heurística sencilla (3 líneas) calculando estado (`feliz` / `neutro` / `alerta`) según merma y variación de ventas. | Modelo predictivo de scoring operativo multidimensional. |
| **Popup de Inventario** | Popup funcional consumiendo `GET /api/inventario?tienda=S001`. | Paginación virtualizada y edición masiva de existencias. |
| **Chatbot sobre Inventario** | **Gemini con acceso analítico a la DB:** endpoint que consulta datos de inventario o Text-to-SQL asistido. | Agente autónomo con múltiples agentes especializados y RAG empresarial. |
| **Panel IA (Re-Stock / Promos / Precios)** | **100% Funcional:** Fórmulas, aceptar, rechazar, editar, agregar manual y efecto en órdenes/precios. | Conexión con ERPs reales (SAP, Oxxo API) y emisión de PO electrónicas. |
| **Scraping de Competencia** | Precios cargados con el script demo existente (`npm run db:competencia -- --demo`). | Cron job automatizado con Playwright / Cheerio scrapeando competidores reales. |

---

## 3. Plan de Acción por Módulo para el Prototipo

### A. Mapa y Navegación entre Vistas (`?id=#`)
- **Arquitectura de Vistas en Frontend:**
  - **Vista 1: Dashboard General (`/`):**
    - Muestra el mapa con las tiendas distribuidas geográficamente.
    - Muestra los paneles breves de la red con datos placeholder (tienda más productiva, tienda menos productiva, total de ventas red).
    - Botón *"Agregar Tienda"* visible, pero deshabilitado o con un modal demostrativo *"Próximamente"*.
    - Al hacer click sobre un marcador de tienda en el mapa, navega a: `/sucursal?id=S001`.
  - **Vista 2: Detalle de Sucursal (`/sucursal?id=S001` o `/?id=S001`):**
    - Lee el parámetro `id` de la URL.
    - Llama a `GET /api/dashboard/:id` para renderizar:
      1. Resumen de productos más vendidos.
      2. Resumen de productos menos vendidos.
      3. Métricas clave (ticket promedio, conversión, margen, merma).
      4. El Avatar interactivo en el centro.
      5. Botón para abrir el popup de inventario.
      6. Panel izquierdo con los 3 botones de asistencia IA (Re-Stock, Promociones, Precios).
- **Solución rápida de Coordenadas en 24h:**
  - En lugar de modificar migraciones de base de datos, tener un archivo de configuración en frontend (o un helper en backend) con las coordenadas de las ciudades de los sitios (`site_id` o `store_id`):
    ```javascript
    // Ejemplo: helper en front o back para pintar pines en el mapa
    const COORDENADAS_SITIOS = {
      "Airport 1": { lat: 25.7781, lng: -100.1070 },
      "Rail Station 2": { lat: 19.4326, lng: -99.1332 },
      // ... coordenadas representativas por ciudad/sitio
    };
    ```

---

### B. Barra de Búsqueda
- **Comportamiento en 24h:**
  - Si el usuario busca una tienda: funciona como un dropdown o autocompletado rápido que redirige a `/?id=S###`.
  - Si el usuario presiona Enter con una pregunta o hace click en el icono del bot: abre el modal/drawer del asistente virtual pasando la pregunta al backend.

---

### C. Chatbot con Gemini y Acceso Directo a la Base de Datos
- **Propuesta del equipo:** *"podríamos pasarlo a Gemini al tener acceso a toda la DB, para que pueda acceder directamente en lugar de depender de la vista del inventario"*.
- **Cómo implementarlo en menos de 2 horas sin romper nada:**
  Actualmente, el backend ya cuenta con `backend/src/services/gemini.service.js` y el pool de PostgreSQL en `backend/src/config/db.config.js`. Se pueden habilitar dos opciones según la preferencia del equipo:

  #### Opción 1: Gemini Text-to-SQL Seguro (Lectura)
  1. El usuario pregunta algo en la barra o en el inventario (ej. *"¿Qué productos de panadería tienen más de 3 días sin venderse?"* o *"Hazme un resumen del inventario de S001"*).
  2. Gemini recibe el esquema de las vistas clave (`v_inventario_diario`, `v_ventas_diarias`, `products`).
  3. Gemini genera una sentencia `SELECT ...`.
  4. El backend valida que la consulta comience estrictamente con `SELECT` (solo lectura) y la ejecuta en Postgres.
  5. Gemini recibe las filas resultantes y redacta la respuesta ejecutiva en lenguaje natural.

  #### Opción 2: Prompt Enriquecido por Contexto (Ultra Rápido)
  Si no se desea implementar Text-to-SQL, basta con que el endpoint `/api/chat` reciba un flag `contexto`:
  - Si viene de la tienda general: usa el resumen de ventas actual.
  - Si viene del popup de inventario: el backend hace un `SELECT * FROM v_inventario_diario WHERE store_id = $1 AND date = (SELECT max(date) FROM inventory_daily)` y le pasa a Gemini los totales agregados por categoría y los productos con quiebre o merma, con un prompt del sistema:
    > *"Eres el Asistente Experto de Inventario de Otzo. Analiza los siguientes datos de stock y responde la pregunta o genera el resumen solicitado de forma clara y ejecutiva."*

---

### D. Avatar Reactivo al Rendimiento
- **Implementación recomendada para 24h:**
  - El backend ya calcula en `estadisticas`: `merma_pct` (y su variación), `margen_pct`, y `venta_total.variacion_pct`.
  - Agregar un atributo sintético en la respuesta de `GET /api/dashboard/:tienda` (o calcularlo en el front):
    ```javascript
    // Heurística de estado del Avatar para 24h:
    let animacion = "neutral";
    if (venta_total.variacion_pct > 5 && merma_pct.valor < 10) {
      animacion = "feliz"; // Excelente rendimiento
    } else if (venta_total.variacion_pct < -5 || merma_pct.valor > 18) {
      animacion = "preocupado"; // Rendimiento crítico / bajo
    }
    ```
  - En frontend, el componente Avatar simplemente asocia la animación según el valor recibido: `feliz` (celebrando/sonriendo), `neutral` (saludando), `preocupado` (buscando soluciones/alerta).

---

### E. Panel de Asistencia con IA (Lado Izquierdo)
- **Estado:** ¡Ya está listo en el backend!
  - **Re-Stock:** Fórmulas con días de entrega y stock de seguridad listas en `Candidatos.reposicion`.
  - **Promociones:** Detección de merma por caducidad y baja rotación listas en `Candidatos.promocion`.
  - **Precios Rivales:** Cálculo de brecha de precios con competencia listo en `Candidatos.precios`.
  - **Interacciones:**
    - Botón **Aceptar** -> Llama a `POST /api/recomendaciones/:id/aceptar` (crea orden de compra o actualiza precio).
    - Botón **Rechazar** -> Llama a `POST /api/recomendaciones/:id/rechazar` (guarda motivo y lo excluye por 7 días).
    - Botón **Editar** -> Llama a `PATCH /api/recomendaciones/:id` con la cantidad/descuento/precio editado.
    - Botón **Agregar opción** -> Llama a `POST /api/recomendaciones` (permite que el gerente agregue una sugerencia manual).
  - **Datos de Rivales para la Demo:**
    - Correr en terminal antes de la presentación:
      ```bash
      npm run db:competencia -- --demo
      ```
      Esto llena automáticamente la tabla `precios_competencia` con variaciones creíbles para todos los productos. En el pitch se explica que el sistema cuenta con el endpoint `POST /api/competencia/precios` listo para recibir datos de web scrapers.

---

## 4. Recomendaciones Priorizadas para el Equipo

### 🛠️ Para el Desarrollador de Backend (Tiempo estimado: ~2 horas)

1. **Ajustar `POST /api/chat` para no exigir `tienda` obligatoria:**
   - Modificar la validación en `backend/src/controllers/asistente.controller.js` para que si `tienda` es nula, responda consultas globales del negocio o active la herramienta de base de datos.
2. **Habilitar consulta analítica a la DB para Gemini:**
   - Crear una función en `gemini.service.js` o un helper en `asistente.controller.js` que permita responder preguntas sobre el inventario completo cuando se invoque desde el popup.
3. **Puntaje / Estado del Avatar en `dashboard.service.js`:**
   - Devolver en el JSON de `GET /api/dashboard/:tienda` una clave:
     `avatar: { animacion: "feliz" | "neutral" | "preocupado", motivo: "Ventas +15% vs semana anterior" }`.
4. **Ejecutar el seed de competencia:**
   - Asegurarse de ejecutar `npm run db:competencia -- --demo` en el entorno donde corra la demo para que el panel de cambio de precios muestre datos inmediatos.

---

### 🎨 Para el Desarrollador de Frontend (Tiempo estimado: ~4-6 horas)

1. **Control de Rutas con Parámetro `?id=`:**
   - En la página principal, si no hay `?id=` en la URL -> mostrar la **Vista General (Mapa con pines + Panels placeholder de red)**.
   - Si la URL tiene `?id=S001` -> mostrar la **Vista Detalle de Tienda**.
2. **Marcadores del Mapa:**
   - Renderizar los pines en el mapa usando una librería ligera (Leaflet, Mapbox o react-simple-maps).
   - Evento `onClick` del marcador: `navigate('/?id=' + store.store_id)`.
3. **Barra de Búsqueda:**
   - Campo de entrada con autocompletado de tiendas (S001 - S038). Al seleccionar una, redirigir a `?id=S###`.
   - Botón de chat integrado para enviar preguntas directas a Gemini.
4. **Popup de Inventario con Botón "Resumen IA":**
   - El botón superior del popup debe enviar un mensaje a `/api/chat` con `tienda: id` y `mensaje: "Genera un resumen ejecutivo del estado actual de este inventario, destacando faltantes y mermas"`.
5. **Panel Izquierdo de IA (Tablas de Recomendaciones):**
   - Consumir `GET /api/recomendaciones/:id?tipo=reposicion`, `promocion` y `precio`.
   - Renderizar las tablas con sus botones de **Aceptar**, **Rechazar**, **Editar** y el botón **+ Agregar sugerencia**.
6. **Avatar Animado:**
   - Un componente visual central que cambie de ilustración/sprite según el campo `avatar.animacion` que retorne el backend.

---

### 🎤 Para el Pitch / Presentación (Guión de 3 Minutos)

1. **Minuto 1: El Problema y la Red General (Dashboard + Mapa)**
   - Mostrar el mapa con la red de sucursales en aeropuertos y estaciones.
   - Mostrar la visión de supervisión centralizada y cómo se monitorean múltiples tiendas.
   - Mencionar que el sistema está preparado para expansión (mostrando el botón de agregar tienda pensado a futuro).
2. **Minuto 2: Entrada a Sucursal y el Avatar en Acción**
   - Hacer click en una tienda crítica (ej. `S001`). La URL cambia dinámicamente (`?id=S001`).
   - Señalar cómo el **Avatar** reacciona inmediatamente al rendimiento de la tienda (alertando si hay merma o celebrando altas ventas).
   - Abrir el **Popup de Inventario** y presionar el botón de **Resumen con Gemini**: mostrar cómo la IA analiza la base de datos completa en segundos para dar un diagnóstico claro.
3. **Minuto 3: La Magia del Panel de Asistencia con IA (El Agente que Aprende)**
   - Mostrar las 3 pestañas: Re-Stock inteligente, Promociones anti-merma (estilo Oxxo) y Precios competitivos (vía scraping/benchmarking).
   - **Momento Wow:** Editar una cantidad sugerida de re-stock o rechazar una opción con motivo. Explicar cómo el sistema guarda la retroalimentación en PostgreSQL para que las próximas propuestas se adapten automáticamente a las preferencias del gerente.
   - Cerrar mencionando la escalabilidad de la arquitectura hacia memorias vectoriales continuas (Backboard) en la siguiente etapa.
