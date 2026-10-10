// Especificación OpenAPI 3 de la API de Otzo.
// Se ve en http://localhost:5000/api/docs  (JSON crudo en /api/docs.json)
// Al agregar un endpoint nuevo, agrégalo también en `paths`.

const tienda = { name: "tienda", in: "path", required: true, schema: { type: "string", example: "S001" }, description: "ID de tienda (S###)" };
const tiendaQ = { name: "tienda", in: "query", schema: { type: "string", example: "S001" }, description: "Filtra por tienda; sin valor = todas" };
const fecha = { name: "fecha", in: "query", schema: { type: "string", format: "date", example: "2026-09-30" }, description: "Sin valor = último día con datos" };
const desde = { name: "desde", in: "query", schema: { type: "string", format: "date", example: "2026-09-01" } };
const hasta = { name: "hasta", in: "query", schema: { type: "string", format: "date", example: "2026-09-30" } };
const idRec = { name: "id", in: "path", required: true, schema: { type: "integer", example: 1 }, description: "id de la recomendación" };
const tipoRec = { type: "string", enum: ["reposicion", "promocion", "precio"] };
// Cada tipo solo admite su campo: reposicion → cantidad · promocion → descuento_pct · precio → precio
const ajustes = { type: "object", properties: {
  cantidad: { type: "integer", minimum: 1, example: 24, description: "Solo en reposicion" },
  descuento_pct: { type: "number", minimum: 1, maximum: 90, example: 20, description: "Solo en promocion" },
  precio: { type: "number", minimum: 0.01, example: 2.75, description: "Solo en precio" },
} };
const limite = (def, max) => ({ name: "limite", in: "query", schema: { type: "integer", default: def, minimum: 1, maximum: max } });

// Respuesta estándar { success: true, data, meta? }
const okJson = (descripcion, data = { type: "object" }) => ({
  200: {
    description: descripcion,
    content: { "application/json": { schema: {
      type: "object",
      properties: { success: { type: "boolean", example: true }, data, meta: { type: "object" } },
    } } },
  },
  400: { $ref: "#/components/responses/Error" },
  404: { $ref: "#/components/responses/Error" },
});
const lista = (ref) => ({ type: "array", items: { $ref: `#/components/schemas/${ref}` } });

export const openapi = {
  openapi: "3.0.3",
  info: {
    title: "API Otzo – Tienda Inteligente",
    version: "1.0.0",
    description:
      "Reto Softek. Datos del 2025-10-01 al 2026-09-30, 38 tiendas. Fechas en YYYY-MM-DD y tiendas como S001. " +
      "Todas las respuestas tienen la forma `{ success, data, meta? }`.",
  },
  servers: [{ url: "/api", description: "Este servidor" }],
  tags: [
    { name: "General" }, { name: "Dashboard", description: "Panel izquierdo del front" },
    { name: "Recomendaciones", description: "Panel de asistencia IA: re-stock, promociones y cambio de precio. Una fila por producto." },
    { name: "Competencia", description: "Precios de tiendas rivales (los carga el scraper o `npm run db:competencia -- --demo`)" },
    { name: "Asistente", description: "Chat y voz de la cajera. Gastan créditos de IA: máximo 10 por minuto." },
    { name: "Inventario" }, { name: "Ventas" }, { name: "Tiendas" }, { name: "Productos" },
  ],
  paths: {
    "/health": { get: { tags: ["General"], summary: "Estado de la API y la base de datos", responses: okJson("API y base arriba") } },

    "/dashboard/{tienda}": { get: {
      tags: ["Dashboard"],
      summary: "Mejores y peores ventas, estadísticas e inventario de una tienda",
      description: "Periodo = últimos `dias` días hasta `hasta`. Cada indicador trae `variacion_pct` contra los `dias` anteriores.",
      parameters: [tienda, { name: "dias", in: "query", schema: { type: "integer", default: 7, minimum: 1, maximum: 90 } }, hasta, limite(3, 20)],
      responses: okJson("Datos del panel", { $ref: "#/components/schemas/Dashboard" }),
    } },

    "/recomendaciones/{tienda}": { get: {
      tags: ["Recomendaciones"], summary: "Tabla de sugerencias de un tipo (la genera la primera vez del día)",
      description:
        "**Con `tipo`**: si hoy aún no se generó, el agente la genera y la guarda; después devuelve lo guardado (no gasta Gemini en cada recarga). " +
        "**Sin `tipo`**: solo devuelve lo que ya existe hoy, sin generar (útil para contadores). " +
        "Incluye las pendientes que agregó el gerente en días anteriores. " +
        "El agente no repite productos rechazados en 7 días, aceptados hoy ni los que el gerente dejó pendientes, y ajusta cantidad/descuento según cómo los ha corregido el gerente.",
      parameters: [tienda,
        { name: "tipo", in: "query", schema: tipoRec, description: "Botón del panel. Sin tipo = solo lo existente" },
        { name: "regenerar", in: "query", schema: { type: "string", enum: ["1"] }, description: "Descarta las pendientes del agente de ese tipo y genera de nuevo (límite 10/min)" }],
      responses: { ...okJson("Filas", lista("Recomendacion")), 429: { $ref: "#/components/responses/Error" } },
    } },
    "/recomendaciones": { post: {
      tags: ["Recomendaciones"], summary: "El gerente agrega una opción que el agente no sugirió",
      requestBody: { required: true, content: { "application/json": {
        schema: { type: "object", required: ["tienda", "tipo", "sku"], properties: {
          tienda: { type: "string", example: "S001" }, tipo: tipoRec, sku: { type: "string", example: "SKU-100694" },
          cantidad: { type: "integer" }, descuento_pct: { type: "number" }, precio: { type: "number" },
          motivo: { type: "string", example: "Viene puente y se vende más" },
        } },
        examples: {
          reposicion: { value: { tienda: "S001", tipo: "reposicion", sku: "SKU-100694", cantidad: 24 } },
          promocion: { value: { tienda: "S001", tipo: "promocion", sku: "SKU-100694", descuento_pct: 20 } },
          precio: { value: { tienda: "S001", tipo: "precio", sku: "SKU-100694", precio: 21.5 } },
        } } } },
      responses: { 201: { description: "Creada como pendiente" }, 400: { $ref: "#/components/responses/Error" },
        404: { $ref: "#/components/responses/Error" }, 409: { $ref: "#/components/responses/Error" } },
    } },
    "/recomendaciones/{id}": { patch: {
      tags: ["Recomendaciones"], summary: "Editar (botón Editar). Sigue pendiente",
      parameters: [idRec], requestBody: { required: true, content: { "application/json": { schema: ajustes } } },
      responses: { ...okJson("Fila editada", { $ref: "#/components/schemas/Recomendacion" }), 409: { $ref: "#/components/responses/Error" } },
    } },
    "/recomendaciones/{id}/precio": { patch: {
      tags: ["Recomendaciones"], summary: "Alias de PATCH /recomendaciones/{id} (versión anterior)",
      parameters: [idRec], requestBody: { required: true, content: { "application/json": { schema: ajustes } } },
      responses: okJson("Fila editada", { $ref: "#/components/schemas/Recomendacion" }),
    } },
    "/recomendaciones/{id}/aceptar": { post: {
      tags: ["Recomendaciones"], summary: "Aceptar (botón Aceptar)",
      description: "reposicion → crea un pedido en `purchase_orders` (In transit) · precio → cierra el precio vigente y abre el nuevo en `prices` · " +
        "promocion → queda registrada como aceptada. Acepta los mismos campos que Editar para editar y aceptar en una sola llamada.",
      parameters: [idRec], requestBody: { content: { "application/json": { schema: ajustes } } },
      responses: { ...okJson("Fila aceptada", { $ref: "#/components/schemas/Recomendacion" }), 409: { $ref: "#/components/responses/Error" } },
    } },
    "/recomendaciones/{id}/rechazar": { post: {
      tags: ["Recomendaciones"], summary: "Rechazar (botón Rechazar)",
      description: "El motivo se guarda para que el agente aprenda. Ese producto no se vuelve a sugerir en 7 días.",
      parameters: [idRec],
      requestBody: { content: { "application/json": { schema: { type: "object", properties: { motivo: { type: "string", example: "No hay espacio en el refri" } } } } } },
      responses: { ...okJson("Fila rechazada", { $ref: "#/components/schemas/Recomendacion" }), 409: { $ref: "#/components/responses/Error" } },
    } },

    "/competencia/precios": {
      get: {
        tags: ["Competencia"], summary: "Último precio de cada competidor",
        parameters: [{ name: "sku", in: "query", schema: { type: "string", example: "SKU-100694" } }],
        responses: okJson("Precios", { type: "array", items: { type: "object", properties: {
          sku: { type: "string" }, producto: { type: "string" }, competidor: { type: "string" },
          precio: { type: "number" }, fecha: { type: "string" }, fuente: { type: "string", nullable: true } } } }),
      },
      post: {
        tags: ["Competencia"], summary: "Cargar precios (para el scraper). Requiere header x-admin-key",
        description: "Hasta 1000 por petición. Si ya existe (sku, competidor, fecha) se actualiza. Los SKU que no existen se ignoran.",
        security: [{ adminKey: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { precios: {
          type: "array", items: { type: "object", required: ["sku", "competidor", "precio"], properties: {
            sku: { type: "string", example: "SKU-100694" }, competidor: { type: "string", example: "Competidor A" },
            precio: { type: "number", example: 22.5 }, fecha: { type: "string", format: "date" }, fuente: { type: "string", example: "scraper" } } } } } } } } },
        responses: { ...okJson("Resultado: recibidos, guardados, ignorados"), 401: { $ref: "#/components/responses/Error" }, 503: { $ref: "#/components/responses/Error" } },
      },
    },

    "/chat": { post: {
      tags: ["Asistente"], summary: "Pregunta a la cajera (Gemini, con datos de la tienda)",
      requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["tienda", "mensaje"], properties: {
        tienda: { type: "string", example: "S001" }, mensaje: { type: "string", maxLength: 300, example: "¿Qué se vendió mejor esta semana?" } } } } } },
      responses: { ...okJson("{ respuesta }", { type: "object", properties: { respuesta: { type: "string" } } }),
        429: { $ref: "#/components/responses/Error" }, 503: { $ref: "#/components/responses/Error" } },
    } },
    "/voz": { post: {
      tags: ["Asistente"], summary: "Texto a voz (ElevenLabs). Devuelve audio mp3",
      description: "La misma frase se guarda en caché y no vuelve a gastar créditos.",
      requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["texto"], properties: {
        texto: { type: "string", maxLength: 400, example: "Hola, bienvenido a Otzo" } } } } } },
      responses: { 200: { description: "Audio", content: { "audio/mpeg": { schema: { type: "string", format: "binary" } } } },
        429: { $ref: "#/components/responses/Error" }, 503: { $ref: "#/components/responses/Error" } },
    } },

    "/inventario": { get: {
      tags: ["Inventario"], summary: "Movimiento de inventario de un día (tabla del popup)",
      parameters: [tiendaQ, fecha, { name: "categoria", in: "query", schema: { type: "string", example: "Bakery" } },
        { name: "alertas", in: "query", schema: { type: "boolean" }, description: "Solo productos sin stock, en 0 o con merma" }],
      responses: okJson("Filas de inventario", lista("FilaInventario")),
    } },
    "/inventario/resumen": { get: {
      tags: ["Inventario"], summary: "Vendidos, merma y horas sin stock por tienda en un rango",
      parameters: [desde, hasta, tiendaQ], responses: okJson("Resumen por tienda", { type: "array", items: { type: "object" } }),
    } },
    "/inventario/export": { get: {
      tags: ["Inventario"], summary: "Descarga el inventario del día en Excel (.xlsx)",
      description: "Mismos filtros que /inventario. Incluye hoja de detalle y hoja de resumen por tienda.",
      parameters: [tiendaQ, fecha, { name: "categoria", in: "query", schema: { type: "string" } }, { name: "alertas", in: "query", schema: { type: "boolean" } }],
      responses: {
        200: { description: "Archivo Excel", content: { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": { schema: { type: "string", format: "binary" } } } },
        404: { $ref: "#/components/responses/Error" },
      },
    } },

    "/ventas/diarias": { get: {
      tags: ["Ventas"], summary: "Serie diaria de ventas con feriados y venta con promoción",
      description: "Sin fechas = últimos 30 días con datos.",
      parameters: [tiendaQ, desde, hasta], responses: okJson("Serie diaria", { type: "array", items: { type: "object" } }),
    } },
    "/ventas/top-productos": { get: {
      tags: ["Ventas"], summary: "Productos más vendidos", parameters: [tiendaQ, desde, hasta, limite(10, 100)],
      responses: okJson("Ranking", { type: "array", items: { type: "object" } }),
    } },
    "/promociones": { get: {
      tags: ["Ventas"], summary: "Desempeño de cada promoción vs. su uplift esperado",
      responses: okJson("Promociones", { type: "array", items: { type: "object" } }),
    } },

    "/tiendas": { get: {
      tags: ["Tiendas"], summary: "Lista de tiendas",
      parameters: [{ name: "region", in: "query", schema: { type: "string", example: "Northeast" } }],
      responses: okJson("Tiendas", lista("Tienda")),
    } },
    "/tiendas/{tienda}": { get: { tags: ["Tiendas"], summary: "Detalle de una tienda y sus cierres", parameters: [tienda], responses: okJson("Tienda", { $ref: "#/components/schemas/Tienda" }) } },
    "/tiendas/{tienda}/kpis": { get: {
      tags: ["Tiendas"], summary: "KPIs diarios: tránsito, tickets, ticket promedio, conversión, productividad",
      parameters: [tienda, desde, hasta], responses: okJson("KPIs por día", { type: "array", items: { type: "object" } }),
    } },

    "/productos": { get: {
      tags: ["Productos"], summary: "Catálogo paginado",
      parameters: [
        { name: "q", in: "query", schema: { type: "string", example: "donut" }, description: "Busca en nombre o SKU" },
        { name: "departamento", in: "query", schema: { type: "string", example: "Bakery" } },
        { name: "categoria", in: "query", schema: { type: "string" } },
        { name: "pagina", in: "query", schema: { type: "integer", default: 1 } }, limite(50, 500),
      ],
      responses: okJson("Productos", { type: "array", items: { type: "object" } }),
    } },
    "/productos/categorias": { get: { tags: ["Productos"], summary: "Departamentos y categorías con conteo", responses: okJson("Categorías", { type: "array", items: { type: "object" } }) } },
    "/productos/{sku}": { get: {
      tags: ["Productos"], summary: "Detalle de un producto y su proveedor",
      parameters: [{ name: "sku", in: "path", required: true, schema: { type: "string", example: "SKU-100003" } }],
      responses: okJson("Producto"),
    } },
  },

  components: {
    securitySchemes: { adminKey: { type: "apiKey", in: "header", name: "x-admin-key", description: "ADMIN_KEY de backend/.env" } },
    responses: {
      Error: {
        description: "Error",
        content: { "application/json": { schema: {
          type: "object",
          properties: { success: { type: "boolean", example: false }, error: { type: "object", properties: { message: { type: "string" } } } },
        } } },
      },
    },
    schemas: {
      Variacion: { type: "object", properties: { valor: { type: "number" }, variacion_pct: { type: "number", nullable: true } } },
      ProductoVenta: { type: "object", properties: {
        sku: { type: "string" }, producto: { type: "string" }, categoria: { type: "string" },
        unidades: { type: "integer" }, venta: { type: "number" }, venta_periodo_anterior: { type: "number" }, variacion_pct: { type: "number", nullable: true },
      } },
      BloqueVentas: { type: "object", properties: {
        venta_total: { type: "number", example: 4281.55 }, unidades: { type: "integer", example: 666 },
        variacion_pct: { type: "number", example: 19.6 }, productos: lista("ProductoVenta"),
      } },
      ProductoInventario: { type: "object", properties: {
        sku: { type: "string" }, producto: { type: "string" }, categoria: { type: "string" }, perecedero: { type: "boolean" },
        existencia: { type: "integer" }, en_camino: { type: "integer" }, venta_diaria: { type: "number" }, dias_cobertura: { type: "number", nullable: true },
        dias_entrega_proveedor: { type: "integer" }, horas_sin_stock: { type: "number" },
        estado: { type: "string", enum: ["sin_stock", "bajo", "ok"] }, bajo: { type: "boolean" },
      } },
      Dashboard: { type: "object", properties: {
        tienda: { type: "object", properties: { store_id: { type: "string" }, nombre: { type: "string" }, sitio: { type: "string" }, region: { type: "string" } } },
        periodo: { type: "object", properties: { desde: { type: "string" }, hasta: { type: "string" }, dias: { type: "integer" }, comparado_con: { type: "object" } } },
        mejores_ventas: { $ref: "#/components/schemas/BloqueVentas" },
        peores_ventas: { $ref: "#/components/schemas/BloqueVentas" },
        estadisticas: { type: "object", properties: {
          ticket_promedio: { $ref: "#/components/schemas/Variacion" }, conversion_pct: { $ref: "#/components/schemas/Variacion" },
          margen_pct: { $ref: "#/components/schemas/Variacion" }, merma_pct: { $ref: "#/components/schemas/Variacion" },
          tickets_por_hora_personal: { $ref: "#/components/schemas/Variacion" }, venta_total: { $ref: "#/components/schemas/Variacion" },
        } },
        inventario: { type: "object", properties: {
          fecha: { type: "string" }, total_productos: { type: "integer" }, bajos: { type: "integer" }, productos: lista("ProductoInventario"),
        } },
      } },
      FilaInventario: { type: "object", properties: {
        fecha: { type: "string" }, tienda: { type: "string" }, sitio: { type: "string" }, sku: { type: "string" }, producto: { type: "string" },
        categoria: { type: "string" }, inicial: { type: "integer" }, recibido: { type: "integer" }, vendidos: { type: "integer" },
        caducado: { type: "integer" }, danado: { type: "integer" }, cierre: { type: "integer" }, en_camino: { type: "integer" },
        horas_sin_stock: { type: "number" }, valor_inventario: { type: "number" },
      } },
      Recomendacion: { type: "object", properties: {
        id: { type: "integer" }, store_id: { type: "string" }, tipo: tipoRec,
        prioridad: { type: "string", enum: ["alta", "media", "baja"] }, sku: { type: "string" }, producto: { type: "string" },
        descripcion: { type: "string", description: "Motivo de la sugerencia (Gemini o texto de la regla)" },
        origen: { type: "string", enum: ["agente", "gerente"] }, estado: { type: "string", enum: ["pendiente", "aceptada", "rechazada"] },
        editada: { type: "boolean" },
        cantidad: { type: "integer", nullable: true }, descuento_pct: { type: "number", nullable: true },
        precio_actual: { type: "number", nullable: true }, precio_propuesto: { type: "number", nullable: true },
        motivo_rechazo: { type: "string", nullable: true }, propuesta_original: { type: "object", nullable: true },
        competencia: { type: "object", nullable: true, description: "Solo en precio: promedio, minimo y número de competidores (30 días)",
          properties: { promedio: { type: "number" }, minimo: { type: "number" }, competidores: { type: "integer" } } },
        creada_en: { type: "string" }, resuelta_en: { type: "string", nullable: true },
      } },
      Tienda: { type: "object", properties: {
        store_id: { type: "string" }, store_name: { type: "string" }, format: { type: "string" }, operator_type: { type: "string" },
        opening_time: { type: "string", nullable: true }, closing_time: { type: "string", nullable: true },
        site_id: { type: "string" }, site_name: { type: "string" }, site_type: { type: "string" }, region: { type: "string" }, traffic_tier: { type: "number" },
      } },
    },
  },
};
