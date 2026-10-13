# Analizalo IA! – Plataforma Inteligente de Operaciones Retail y Copiloto IA

<div align="center">

![Otzo Logo](./IMAGES/LOGO.png)

**Optimización Operativa, Analítica Predictiva y Toma de Decisiones en Tiempo Real para Redes de Tiendas de Conveniencia**

*Desarrollado para el Reto Softtek · HackTec Saltillo*

[![Node.js](https://img.shields.io/badge/Node.js-22_LTS-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express.js-4.21-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%2F17-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini_API-3.8_Flash-8E75C2?style=for-the-badge&logo=googlegemini&logoColor=white)](https://ai.google.dev/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9-199900?style=for-the-badge&logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![Swagger](https://img.shields.io/badge/Swagger_UI-OpenAPI_3-85EA2D?style=for-the-badge&logo=swagger&logoColor=black)](http://localhost:5000/api/docs)
[![Tiger](https://img.shields.io/badge/Tiger_Data-Base_de_Datos-F5A623?style=for-the-badge&logo=timescale&logoColor=white)](https://www.tigerdata.com/)
[![Vultr](https://img.shields.io/badge/Vultr-Despliegue-007BFC?style=for-the-badge&logo=vultr&logoColor=white)](https://www.vultr.com/)
[![Backboard](https://img.shields.io/badge/Backboard-Memoria_IA-111827?style=for-the-badge)](https://backboard.io/)

</div>

---

## 📌 Tabla de Contenidos
1. [Descripción General y Propósito](#-descripción-general-y-propósito)
2. [Arquitectura del Sistema](#-arquitectura-del-sistema)
3. [Módulos Principales de la Aplicación](#-módulos-principales-de-la-aplicación)
   - [Centro de Control Geográfico (Mapa de Red)](#1-centro-de-control-geográfico-mapa-de-red)
   - [Interfaz Operativa por Sucursal (Store View & Escenario)](#2-interfaz-operativa-por-sucursal-store-view--escenario)
   - [Motor de Sugerencias Operativas IA (Reposición, Promociones y Precios)](#3-motor-de-sugerencias-operativas-ia)
   - [Control de Inventario y Auditoría Exportable](#4-control-de-inventario-y-auditoría-exportable)
   - [Asistente Conversacional Multi-Turno con Gemini API](#5-asistente-conversacional-multi-turno-con-gemini-api)
4. [Ingeniería de Datos y Limpieza de Telemetría](#-ingeniería-de-datos-y-limpieza-de-telemetría)
5. [Evolución del Proyecto y Roadmap de Producción](#-evolución-del-proyecto-y-roadmap-de-producción)
   - [Reemplazo del Personaje Provisional por Identidad Propia](#1-reemplazo-del-personaje-provisional-por-identidad-propia)
   - [Perfeccionamiento de Gemini API en la Interfaz por Sucursal](#2-perfeccionamiento-de-gemini-api-en-la-interfaz-por-sucursal)
6. [Estructura del Repositorio](#-estructura-del-repositorio)
7. [Catálogo de Endpoints de la API](#-catálogo-de-endpoints-de-la-api)
8. [Guía de Instalación y Puesta en Marcha](#-guía-de-instalación-y-puesta-en-marcha)
   - [Prerrequisitos](#prerrequisitos)
   - [Configuración de Variables de Entorno](#configuración-de-variables-de-entorno)
   - [Pipeline de Base de Datos](#pipeline-de-base-de-datos)
   - [Ejecución en Desarrollo](#ejecución-en-desarrollo)
9. [Seguridad y Buenas Prácticas](#-seguridad-y-buenas-prácticas)
10. [Equipo de Desarrollo](#-equipo-de-desarrollo)
11. [Créditos y Reconocimientos](#-créditos-y-reconocimientos)

---

## 💡 Descripción General y Propósito

¿Alguna vez has ido a tu tienda favorita buscando un café, una botana o un refresco frío y te dicen: *"se nos terminó"*? ¿O has visto alimentos en descuento que terminan en la basura porque nadie los compró antes de caducar?

Administrar una red de **38 tiendas de conveniencia en Saltillo, Coahuila** no es tarea fácil. En el día a día, los encargados de sucursal y gerentes regionales se enfrentan a situaciones complejas:
* 📉 **Anaqueles vacíos cuando más se necesita (Quiebres de Stock):** Quedarse sin los productos más pedidos justo en horas pico, quincenas o fines de semana calurosos.
* 🗑️ **Desperdicio de productos (Merma por Caducidad):** Pérdidas económicas y comida fresca que se echa a perder por no identificar a tiempo los lotes próximos a vencer.
* 🏷️ **Precios fuera de competencia:** Enterarse demasiado tarde de que la tienda de la esquina tiene mejores promociones o precios más atractivos.
* 📊 **Montañas de datos difíciles de digerir:** Hojas de cálculo infinitas y reportes confusos que roban tiempo valioso que debería dedicarse a atender a los clientes.

### ✨ La Solución: Un Copiloto Inteligente y Amigable
**Analizalo IA!** transforma más de **1.3 millones de registros históricos reales** (ventas minuto a minuto, inventario, precios de rivales, clima de la ciudad y días festivos) en una experiencia **intuitiva, visual y cercana**.

En vez de obligar al usuario a descifrar tablas frías, creamos un **mostrador interactivo con una encargada virtual**:
* 🌟 **Expresiones en tiempo real:** El avatar analiza la salud de la sucursal mediante un índice de ánimo; si las ventas van viento en popa, ¡lo celebra! Si detecta problemas de inventario o merma, cambia de expresión y te alerta con empatía de inmediato.
* 🤖 **Sugerencias de acción listas para ejecutarse:** Gracias a la inteligencia artificial de **Google Gemini**, la plataforma no solo detecta los problemas, sino que te propone soluciones listas: autorizar órdenes de reposición antes de agotar stock, aplicar promociones inteligentes para salvar producto perecedero o ajustar precios competitivos frente a tiendas cercanas. Todo con **un solo clic**.

---

## 🏛 Arquitectura del Sistema

El proyecto implementa un patrón **Decoupled Monorepo** con separación estricta de responsabilidades entre el cliente web (SPA) y el servidor de aplicaciones (BFF - Backend for Frontend):

```mermaid
graph TD
    subgraph FE["Frontend SPA - React 19 y Vite"]
        UI_Map["Mapa de Red Saltillo - Leaflet"]
        UI_Store["Vista por Sucursal - StoreView"]
        UI_Desk["Escenario del Mostrador y Avatar"]
        UI_Modals["Modales de Acción Operativa"]
        UI_Chat["Drawer Conversacional - Asistente IA"]
    end

    subgraph BE["Backend REST API - Node.js y Express"]
        Router["Express Router"]
        Controllers["Controladores Operativos"]
        AnimoService["Servicio de Ánimo - Heurística 0 a 100"]
        ChatDataService["Database Tools Grounding"]
        DBPool["Pool de Conexiones PostgreSQL"]
    end

    subgraph DATA["Capa de Datos e Inteligencia Artificial"]
        Postgres[("PostgreSQL 16/17 y TimescaleDB")]
        GeminiAPI["Google Gemini API - gemini-3.8-flash"]
    end

    UI_Map --> Router
    UI_Store --> Router
    UI_Desk --> Router
    UI_Modals --> Router
    UI_Chat --> Router

    Router --> Controllers
    Controllers --> AnimoService
    Controllers --> DBPool
    Controllers --> ChatDataService
    ChatDataService --> GeminiAPI
    ChatDataService --> DBPool
    DBPool --> Postgres
```

### Principios Arquitectónicos
1. **Seguridad BFF (Backend-for-Frontend):** Las llamadas a la API de Google Gemini y las credenciales de la base de datos residen exclusivamente en el servidor backend. El cliente nunca expone claves de API.
2. **Cero Alucinaciones con Grounding Estricto:** Las respuestas analíticas del asistente IA se alimentan mediante *Function Calling / Database Tools* con consultas SQL parametrizadas a datos verificados. No se ejecuta código SQL generado arbitrariamente por el LLM.
3. **Resiliencia Operativa:** Fallback bidireccional entre la base de datos relacional y datos locales calibrados para asegurar disponibilidad aún bajo desconexiones temporales.

---

## 🚀 Módulos Principales de la Aplicación

### 1. Centro de Control Geográfico (Mapa de Red)
* **Cartografía Dinámica de Saltillo:** Integración con Leaflet y azulejos minimalistas de alto contraste (Stadia Maps Alidade Smooth con fallback automático a CartoDB Positron).
* **Semaforización de Sucursales:** Marcadores geolocalizados que identifican visualmente tiendas destacadas (*Top Performers* en verde) y tiendas con alertas críticas (*Underperforming / Merma alta* en rojo).
* **Búsqueda Inteligente y Control por Voz:** Campo de búsqueda por nombre, identificador (`S001`) o dirección, complementado con reconocimiento de voz en tiempo real mediante la *Web Speech API*.
* **Simulación de Nuevas Sucursales:** Modal para proyectar aperturas de tienda evaluando formato (`Full Counter` vs `Express`), horario de servicio y ubicación regional.

<p align="center">
  <img src="./BOSQUEJO/DASHBOARD_PRINCIPAL.png" alt="Dashboard Principal" />
  <br />
  <sub><i>Figura 1. Dashboard principal: mapa interactivo de Saltillo con las sucursales de la red, ranking de mejores y peores ventas, y barra de búsqueda con voz y consulta a Gemini.</i></sub>
</p>

<p align="center">
  <img src="./BOSQUEJO/PANEL_PER_SUCURSAL.png" alt="Panel por Sucursal - Rendimiento Óptimo" />
  <br />
  <sub><i>Figura 2. Vista operativa de una sucursal con rendimiento óptimo: métricas de ventas a la izquierda, avatar con mensaje contextual en el mostrador y sugerencias de IA a la derecha.</i></sub>
</p>

<p align="center">
  <img src="./BOSQUEJO/PANEL_PER_SUCURSAL_BAD.png" alt="Panel por Sucursal - Atención Requerida" />
  <br />
  <sub><i>Figura 3. La misma vista en una sucursal con estado de «Atención Requerida»: el ánimo del avatar cambia y emite una alerta por baja rotación y stock crítico.</i></sub>
</p>

---

### 2. Interfaz Operativa por Sucursal (Store View & Escenario)
Al seleccionar cualquier tienda del mapa, la aplicación realiza una transición fluida hacia la **pantalla operativa dedicada de la sucursal**:

* **Cuadro de Mando en Vivo (Columna Izquierda):**
  * **Top Ventas:** Productos estrella con facturación y variación porcentual contra el periodo anterior.
  * **Peores Ventas:** Artículos de baja rotación en riesgo de estancamiento.
  * **Métricas Clave (KPIs):** Ticket promedio, tasa de conversión, retención de clientes y margen neto.
  * **Acceso Rápido a Inventario:** Indicador en tiempo real del número de productos con existencias críticas.
* **Escenario de Mostrador y Diagnóstico Visual (Columna Central):**
  * Representación en perspectiva del punto de venta físico: mostrador con terminal POS (`desktop.png`) y la encargada virtual detrás de la caja.
  * **Cálculo Algorítmico del Estado de Ánimo (`animo.service.js`):** Puntuación ponderada de salud de la sucursal:
    $$\text{Puntaje} = 0.45 \times \text{Variación Ventas} + 0.30 \times \text{Control de Merma} + 0.25 \times \text{Disponibilidad Inventario}$$
    Determina si la encargada celebra el éxito operativo o alerta de forma inmediata sobre riesgos.
  * **Globo de Diálogo Dinámico y Arrastrable:** Notificación sintetizada de la situación de la tienda que el usuario puede arrastrar libremente por la pantalla para no obstaculizar la visibilidad.

---

### 3. Motor de Sugerencias Operativas IA
Diseñado para la acción inmediata con tres botones de alto impacto en la columna derecha:

```
┌────────────────────────────────────────────────────────┐
│               PANEL DE SUGERENCIAS IA                  │
├──────────────────────────┬─────────────────────────────┤
│ 📦 Reposición de Stock   │ Generación de órdenes PO    │
│ 🏷️ Promociones Dinámicas │ Descuentos preventivos      │
│ 💲 Ajuste de Precios     │ Benchmark vs Competidores   │
└──────────────────────────┴─────────────────────────────┘
```

| Módulo | Heurística Operativa | Acción al Aceptar | Aprendizaje al Rechazar |
|---|---|---|---|
| **Reposición** | Analiza rotación diaria vs. *lead time* del proveedor (ej. 48h) y umbral mínimo. | Genera registro en `purchase_orders` y exporta archivo JSON idempotente de la orden. | Permite justificar motivo; silencia el producto temporalmente. |
| **Promociones** | Detecta productos con fecha de retiro próxima (`discontinued_date`) y merma proyectada. | Aplica descuento escalonado (10%, 20%, 30%) garantizando precio sobre costo marginal. | Registra motivo de rechazo en memoria operativa para calibrar el modelo. |
| **Precios** | Compara el precio vigente contra comercios rivales en el mismo radio o estación. | Actualiza vigencia en tabla `prices` manteniendo competitividad y margen. | Ajusta parámetros de tolerancia en futuras sugerencias. |

* **Intervención Humana (Human-in-the-Loop):** Los gerentes pueden editar cantidades, porcentajes o precios propuestos antes de confirmar, así como dar de alta sugerencias manuales.

![Sugerencias de Restock](./BOSQUEJO/SUGERENCIAS_RESTOCK.png)
![Sugerencias de Promociones](./BOSQUEJO/SUGERENCIAS_PROMOS.png)
![Sugerencias de Precios](./BOSQUEJO/SUGERENCIAS_PRECIOS.png)

---

### 4. Control de Inventario y Auditoría Exportable
* **Catálogo de Existencias en Vivo:** Modal con buscador reactivo, filtrado por categorías (`Bakery`, `Beverages`, etc.) y estados visuales (`OK`, `Bajo Stock`, `Crítico`).
* **Exportación Directa a Excel (`.xlsx`):** Generador nativo multi-hoja en backend que transmite en streaming un reporte formal con hojas de *Detalle de Inventario* y *Resumen Ejecutivo*.
* **Puente a IA:** Botón directo *"✨ Preguntar a IA"* que abre el asistente contextualizado con los datos del catálogo abierto.

![Inventario Abierto](./BOSQUEJO/INVENTARIO_OPENED.png)

---

### 5. Asistente Conversacional Multi-Turno con Gemini API
El componente `ChatDrawer` conecta con el endpoint `/api/chat`, el cual aprovecha el SDK oficial `@google/genai` con `gemini-3.8-flash`:

* **Herramientas de Base de Datos Habilitadas:**
  1. `consultar_rango_datos`: Resuelve fechas relativas contra los datos reales cargados.
  2. `resumir_ventas`: Agrupa ventas netas, unidades e importes por fecha, tienda o categoría.
  3. `productos_mas_vendidos`: Clasifica los productos con mayor demanda.
  4. `consultar_inventario`: Detecta quiebres y mermas en fecha seleccionada.
  5. `buscar_productos`: Localiza artículos por SKU o descripción.
  6. `comparar_con_rivales`: Ejecuta benchmark de precios contra tiendas competidoras cercanas.
  7. `listar_rivales`: Información detallada de competidores por zona.
  8. `listar_tiendas`: Catálogo y características de sucursales de la red.
* **Tolerancia a Fallos y Rotación de Modelos:** Si una consulta excede la cuota (HTTP 429) o sufre latencia, el servicio conmuta automáticamente entre `gemini-3.8-flash`, `gemini-3.5-flash` y `gemini-3.1-flash-lite`.

---

## 🧹 Ingeniería de Datos y Limpieza de Telemetría

El dataset oficial del hackathon contenía 14 archivos CSV con múltiples inconsistencias del mundo real. El script automatizado `npm run db:limpiar` ejecuta una tubería que audita y corrige **47 clases de defectos**:

* **Fechas Inconsistentes:** Normalización de fechas en tres formatos dispares a estándar ISO 8601 (`YYYY-MM-DD`).
* **Precios Anómalos:** Corrección de precios capturados erróneamente en centavos.
* **Descuentos Invertidos y Fechas de Promoción:** Reversión de fechas de inicio posteriores al fin de la promoción.
* **Anomalías Climáticas:** Eliminación de lecturas térmicas ficticias (`-999 °C`).
* **Mapeo de SKUs Huérfanos:** Identificación de artículos transaccionados no listados en el catálogo original mediante el atributo `en_catalogo = false`.
* **Registro de Rechazos:** Cualquier registro irrecuperable se almacena en la tabla de auditoría `rechazos` con el motivo exacto documentado en formato JSONB.

El reporte completo de depuración se encuentra documentado en [`docs/database/reporte_calidad.md`](file:///home/tyreans/hacktec/docs/database/reporte_calidad.md).

---

## 🔮 Evolución del Proyecto y Roadmap de Producción

Para la versión final de despliegue y lanzamiento comercial de la plataforma, se definieron dos líneas maestras de evolución:

### 1. Reemplazo del Personaje Provisional por Identidad Propia
> [!IMPORTANT]
> **Transición de Propiedad Intelectual:** Durante el sprint de desarrollo del hackathon, se empleó un avatar provisional animado (estética anime basada en *Matikanefukukitaru* / GIFs de demostración) con el objetivo de validar rápidamente el concepto de empatía visual, presencia de mostrador y respuesta anímica en tiempo récord.

* **Nueva Mascota Corporativa Otzo (IP Original):**
  * Creación y registro de un personaje 100% original con derechos de propiedad intelectual exclusivos para Otzo.
  * Diseño de identidad de marca B2B: un asistente de tienda amigable y profesional, con vestimenta y gafete institucional personalizables.
* **Modernización Tecnológica del Avatar:**
  * Sustitución de GIFs rasterizados por **animaciones vectoriales interactivas** utilizando tecnologías como **Rive**, **Lottie** o modelos tridimensionales ligeros con **Three.js / WebGL**.
  * Transiciones fluidas entre estados emocionales (saludo matutino, celebración de metas, revisión de caja, advertencia de inventario bajo) con cero parpadeo y menor consumo de ancho de banda.
  * Apariencia adaptativa según la región o formato de la tienda (uniforme express, full counter, horario nocturno).

---

### 2. Perfeccionamiento de Gemini API en la Interfaz por Sucursal
> [!TIP]
> **Hacia un Copiloto Operativo Hiper-Contextual:** Actualmente, la interfaz por sucursal consume las estadísticas pre-calculadas y ofrece un chat lateral con inyección de contexto manual. La siguiente etapa integra a Gemini como el **núcleo cognitivo directo de cada mostrador individual**.

```mermaid
sequenceDiagram
    autonumber
    actor Gerente as Encargado de Sucursal
    participant UI as Mostrador StoreView
    participant Copilot as Copiloto Gemini (Branch Context)
    participant ERP as Backend / Base de Datos

    Gerente->>UI: "Gemini, ¿qué ordenamos para el turno nocturno?"
    UI->>Copilot: Enviar Prompt + Snapshot Estado Sucursal (Stock, Clima, Ventas)
    Copilot->>Copilot: Razonamiento multi-variable con Function Calling
    Copilot->>UI: "Sugiero 25 uds de Pan Dulce y aplicar 15% a Lácteos próximos a caducar. ¿Deseas autorizar la orden?"
    Gerente->>UI: Clic en "Autorizar en Mostrador"
    UI->>ERP: POST /api/recomendaciones/aceptar
    ERP-->>UI: Orden #PO-8842 generada y enviada a proveedor
    UI->>Copilot: Confirmación de orden
    Copilot-->>Gerente: "Listo. El proveedor entregará mañana a las 7:00 AM."
```

* **Grounding Automático Bidireccional por Sucursal:**
  * Al ingresar a una tienda (ej. `S001`), Gemini cargará de manera inmediata el contexto operativo completo de dicha ubicación: afluencia peatonal, historial de decisiones del encargado local, condiciones climáticas del sitio y precios de competidores a menos de 1 km.
* **Ejecución de Acciones en la UI mediante Agentic Tool Calling:**
  * Permitir que el LLM no solo responda consultas, sino que emita llamadas a funciones capaces de **abrir modales específicos, rellenar sugerencias de compra o modificar precios** directamente en la pantalla del usuario tras su consentimiento explícito.
* **Interacción por Voz en el Mostrador con Gemini Multimodal Live API:**
  * Conversación de voz fluida bidireccional directamente desde el mostrador físico (usando la integración de audio ya estructurada en `/api/voz` y el protocolo de baja latencia de Gemini), eliminando la necesidad de interactuar por teclado durante la atención al cliente.
* **Diagnóstico Proactivo de Causas Raíz:**
  * En lugar de simplemente mostrar que las ventas bajaron, Gemini redactará automáticamente un análisis causal: *"La caída del 12% en bebidas frías coincide con la tormenta local de ayer y la oferta 2x1 del competidor OXXO adyacente; se recomienda activar el combo de café caliente"*.

---

## 📂 Estructura del Repositorio

```text
hacktec/
├── README.md                           # Documentación maestra del repositorio
├── AGENTS.md                           # Directrices y convenciones para agentes de IA
├── API_INTEGRACION.md                  # Especificación contractual de endpoints e integración
├── AUDITORIA_PREVIA_FRONTEND.md        # Diagnóstico y mapeo de interfaz de usuario
├── OBSERVACIONES_BACKEND.md            # Registro técnico de arquitectura de servicios
├── GUIA_EJECUCION_WSL2.md              # Instrucciones para entornos WSL2 y Linux
├── BOSQUEJO/                           # Wireframes y capturas de diseño de pantallas
├── IMAGES/                             # Logotipos, elementos gráficos y demostraciones
│
├── backend/                            # Servidor REST API en Express.js
│   ├── src/
│   │   ├── config/                     # Configuración de PostgreSQL, Gemini, Swagger y CORS
│   │   ├── controllers/                # Controladores HTTP (tienda, inventario, chat, recs)
│   │   ├── models/                     # Consultas relacionales y abstracción de datos
│   │   ├── routes/                     # Definición de rutas Express
│   │   ├── services/                   # Lógica de negocio (gemini, animo, inventario, excel)
│   │   ├── middlewares/                # Rate limiters, validaciones y manejador de errores
│   │   ├── utils/                      # Formateadores estándar de respuesta (apiResponse)
│   │   ├── app.js                      # Inicialización de la aplicación Express
│   │   └── server.js                   # Entrada del servidor HTTP
│   ├── db/
│   │   ├── migrations/                 # Esquemas SQL (001_schema_otzo.sql)
│   │   └── seeds/                      # Scripts de limpieza (limpiar.js) y carga masiva (cargar.js)
│   ├── scripts/                        # Tareas por lotes (generación diaria de reposiciones)
│   └── package.json                    # Dependencias backend (Node 22+)
│
├── frontend/                           # Cliente Web SPA en React 19 + Vite
│   ├── src/
│   │   ├── assets/                     # Recursos gráficos, iconografía y hojas de estilo
│   │   ├── components/                 # Componentes visuales modulares
│   │   │   ├── DashboardMap.jsx        # Mapa interactivo de la red de sucursales
│   │   │   ├── StoreView.jsx           # Panel de sucursal con mostrador y avatar
│   │   │   ├── UnifiedSuggestionModal.jsx # Modal unificado de sugerencias operativas
│   │   │   ├── InventoryModal.jsx      # Modal de catálogo y exportación Excel
│   │   │   ├── ChatDrawer.jsx          # Panel lateral del Asistente Gemini
│   │   │   ├── AddStoreModal.jsx       # Simulador de apertura de tienda
│   │   │   └── SuccessToast.jsx        # Notificaciones de confirmación de operaciones
│   │   ├── data/                       # Datos iniciales calibrados y fallback
│   │   ├── services/                   # Cliente HTTP (storeApi.js)
│   │   ├── App.jsx                     # Enrutador principal y control de vistas
│   │   └── main.jsx                    # Punto de entrada de React
│   ├── index.html                      # Plantilla HTML base
│   ├── vite.config.js                  # Configuración de Vite y proxy local
│   └── package.json                    # Dependencias frontend (React 19, Leaflet, Oxlint)
│
└── docs/                               # Documentación técnica extendida
    ├── api/README.md                   # Catálogo exhaustivo de payloads de la API
    ├── architecture/README.md          # Especificaciones de diseño de sistemas
    ├── database/                       # Esquemas ERD y reporte de calidad de datos
    └── setup/                          # Guías de despliegue paso a paso
```

---

## 📡 Catálogo de Endpoints de la API

La API cuenta con documentación interactiva disponible en vivo en `http://localhost:5000/api/docs` (Swagger UI).

| Método | Endpoint | Descripción | Casos de Uso en UI |
|---|---|---|---|
| `GET` | `/api/health` | Verificación de salud del servidor y conexión a PostgreSQL | Monitoreo y diagnóstico |
| `GET` | `/api/tiendas` | Listado general de sucursales con coordenadas y formato | Marcadores en `DashboardMap` |
| `GET` | `/api/tiendas/:id` | Detalle específico de una tienda y cierres temporales | Ficha informativa de sucursal |
| `GET` | `/api/dashboard/:tienda` | Resumen completo: top/bottom ventas, KPIs, inventario y ánimo | Panel izquierdo y mostrador de `StoreView` |
| `GET` | `/api/recomendaciones/:tienda` | Recomendaciones pendientes (reposición, promociones, precios) | Contadores y modales de acción |
| `POST` | `/api/recomendaciones` | Alta manual de sugerencia por parte del gerente de tienda | Modal de gerente |
| `PATCH` | `/api/recomendaciones/:id` | Ajuste de cantidad, precio o descuento propuesto | Edición previa a autorización |
| `POST` | `/api/recomendaciones/:id/aceptar` | Confirma la recomendación (crea orden PO o nuevo precio) | Botón "Aceptar sugerencia" |
| `POST` | `/api/recomendaciones/:id/rechazar` | Descarta la propuesta y almacena la justificación | Botón "Rechazar sugerencia" |
| `GET` | `/api/inventario` | Existencias, mermas por caducidad y quiebres de stock | Tabla de `InventoryModal` |
| `GET` | `/api/inventario/export` | Generación y descarga directa en streaming de archivo `.xlsx` | Botón "Descargar Excel" |
| `POST` | `/api/chat` | Conversación multi-turno con Gemini con Function Calling | Panel lateral `ChatDrawer` |
| `POST` | `/api/voz` | Síntesis de voz para respuestas de la encargada virtual | Audio en escenario de mostrador |
| `GET` | `/api/competencia/precios` | Precios recopilados de competidores locales | Benchmark de mercado |

---

## 🛠 Guía de Instalación y Puesta en Marcha

### Prerrequisitos
* **Node.js:** Versión 22 LTS recomendada (mínimo Node.js 18.11+ para `--watch`).
* **PostgreSQL:** Versión 16 o 17 en ejecución en el puerto `5432`.
* **Google Gemini API Key:** Clave válida generada en [Google AI Studio](https://aistudio.google.com/).

---

### Configuración de Variables de Entorno

1. **Backend:**
```bash
cd backend
cp .env.example .env
```
Edita `backend/.env` con tus credenciales:
```ini
PORT=5000
DATABASE_URL=postgresql://postgres:tu_password@localhost:5432/otzo
GEMINI_API_KEY=tu_clave_de_gemini
GEMINI_MODEL=gemini-3.8-flash
NODE_ENV=development
```

2. **Frontend:**
```bash
cd ../frontend
cp .env.example .env
```
Edita `frontend/.env`:
```ini
VITE_API_BASE_URL=http://localhost:5000/api
```

---

### Pipeline de Base de Datos

1. **Crear la base de datos:**
```bash
# En terminal de PostgreSQL o psql:
psql -U postgres -c "CREATE DATABASE otzo;"
```

2. **Limpiar y cargar los datos del reto:**
> Asegúrate de colocar los 14 archivos CSV del dataset en la carpeta `backend/db/datos/`.
```bash
cd backend
npm install
npm run db:limpiar    # Genera db/datos_limpios/ y reporte_calidad.md
npm run db:cargar     # Aplica migraciones DDL e inserta ~1.3M registros
```

3. **(Opcional) Generar lote diario de recomendaciones:**
```bash
npm run recomendaciones:generar
```

---

### Ejecución en Desarrollo

En dos terminales independientes:

```bash
# Terminal 1: Iniciar Servidor Backend Express (Puerto 5000)
cd backend
npm run dev

# Terminal 2: Iniciar Servidor Frontend Vite (Puerto 5173)
cd frontend
npm install
npm run dev
```

* **Frontend Web:** Abre en tu navegador `http://localhost:5173`
* **Swagger API Docs:** Abre `http://localhost:5000/api/docs`
* **Health Check:** `http://localhost:5000/api/health`

---

## 🔒 Seguridad y Buenas Prácticas

1. **Aislamiento de Secretos:** Las claves de base de datos y de Gemini API nunca se transfieren al navegador del cliente ni se versionan en Git (respetando los archivos `.gitignore`).
2. **Protección contra Inyección SQL:** Todas las consultas dinámicas a PostgreSQL se realizan con parámetros posicionales (`$1`, `$2`), previniendo cualquier riesgo de inyección de código.
3. **Limitación de Tasa (Rate Limiting):** Se aplican limitadores con `express-rate-limit` en rutas intensivas como `/api/chat` y `/api/voz` para salvaguardar cuotas de la API de IA.
4. **Validación Estricta de Parámetros:** Esquemas de verificación en todas las funciones ejecutadas por el LLM antes de realizar consultas a la base de datos.
5. **CORS Restringido:** Configuración granular de orígenes permitidos para evitar peticiones no autorizadas de terceros.

---

## 👥 Equipo de Desarrollo

Este proyecto fue desarrollado con pasión, creatividad y enfoque humano durante el **HackTec Saltillo – Reto Softtek 2026**:

<table align="center" width="100%">
  <tr>
    <!-- 1. Product Designer -->
    <td align="center" width="20%" valign="top">
      <a href="https://github.com/Tyreans" target="_blank">
        <img src="https://github.com/Tyreans.png" width="95px" style="border-radius: 50%;" alt="Product Designer"/><br />
        <br />
        <b>Juan Pablo Chavez Ramirez</b>
      </a>
      <br /><br />
      <code>Product Designer</code>
      <br /><br />
      <sub>Diseño de experiencia (UX), arquitectura de información y conceptualización centrada en el usuario.</sub>
      <br /><br />
      <a href="https://github.com/Tyreans">
        <img src="https://img.shields.io/badge/GitHub-Perfil-181717?style=flat-square&logo=github" alt="GitHub Profile" />
      </a>
    </td>
    <!-- 2. Junior UI Designer & Product Storyteller -->
    <td align="center" width="20%" valign="top">
      <a href="https://github.com/paomest345" target="_blank">
        <img src="https://github.com/paomest345.png" width="95px" style="border-radius: 50%;" alt="Junior UI Designer & Product Storyteller"/><br />
        <br />
        <b>Paola Yamilete Mesta Marin</b>
      </a>
      <br /><br />
      <code>Junior UI Designer & Product Storyteller</code>
      <br /><br />
      <sub>Identidad visual, narrativa de marca, assets gráficos y microinteracciones de mostrador.</sub>
      <br /><br />
      <a href="https://github.com/paomest345">
        <img src="https://img.shields.io/badge/GitHub-Perfil-181717?style=flat-square&logo=github" alt="GitHub Profile" />
      </a>
    </td>
    <!-- 3. DevOps & Cloud Engineer -->
    <td align="center" width="20%" valign="top">
      <a href="https://github.com/gerardordz1" target="_blank">
        <img src="https://github.com/gerardordz1.png" width="95px" style="border-radius: 50%;" alt="DevOps & Cloud Engineer"/><br />
        <br />
        <b>Jesús Gerardo Arreola Rodriguez </b>
      </a>
      <br /><br />
      <code>DevOps & Cloud Engineer</code>
      <br /><br />
      <sub>Infraestructura en la nube con Vultr, contenedores, automatización CI/CD y despliegue continuo.</sub>
      <br /><br />
      <a href="https://github.com/gerardordz1">
        <img src="https://img.shields.io/badge/GitHub-Perfil-181717?style=flat-square&logo=github" alt="GitHub Profile" />
      </a>
    </td>
    <!-- 4. Data Engineer & Backend Developer -->
    <td align="center" width="20%" valign="top">
      <a href="https://github.com/MarKoXLanda" target="_blank">
        <img src="https://github.com/MarKoXLanda.png" width="95px" style="border-radius: 50%;" alt="Data Engineer & Backend Developer"/><br />
        <br />
        <b>Marco Fernando Silva Rodriguez</b>
      </a>
      <br /><br />
      <code>Data Engineer & Backend Developer</code>
      <br /><br />
      <sub>Pipeline de datos (+1.3M registros), esquemas relacionales con Tiger Data/PostgreSQL y endpoints REST.</sub>
      <br /><br />
      <a href="https://github.com/MarKoXLanda">
        <img src="https://img.shields.io/badge/GitHub-Perfil-181717?style=flat-square&logo=github" alt="GitHub Profile" />
      </a>
    </td>
    <!-- 5. AI & Backend Engineer -->
    <td align="center" width="20%" valign="top">
      <a href="https://github.com/Patatapou" target="_blank">
        <img src="https://github.com/Patatapou.png" width="95px" style="border-radius: 50%;" alt="AI & Backend Engineer"/><br />
        <br />
        <b>Jose Miguel Esparza Mota</b>
      </a>
      <br /><br />
      <code>AI & Backend Engineer</code>
      <br /><br />
      <sub>Integración de Google Gemini API, memoria de contexto con Backboard, grounding SQL y lógica operativa.</sub>
      <br /><br />
      <a href="https://github.com/Patatapou">
        <img src="https://img.shields.io/badge/GitHub-Perfil-181717?style=flat-square&logo=github" alt="GitHub Profile" />
      </a>
    </td>
  </tr>
</table>

---

## 🏆 Créditos y Reconocimientos

Proyecto desarrollado en el marco del **HackTec Saltillo – Reto Softtek 2026**.

* **Agradecimientos Especiales:** A **Softtek** y a los mentores de **HackTec** por proveer un desafío de datos riguroso que refleja la escala, complejidad y riqueza del sector retail en México.
* **Propósito:** Demostrar cómo la combinación de diseño empático, ingeniería de datos sólida e inteligencia artificial generativa puede transformar la vida cotidiana de quienes operan el comercio minorista.

<div align="center">
  <sub>Construido con tecnología de vanguardia para impulsar el futuro de las tiendas inteligentes.</sub>
</div>
