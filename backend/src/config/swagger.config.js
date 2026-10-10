// Especificación OpenAPI 3 de la API de Otzo.
// Se ve en http://localhost:5000/api/docs  (JSON crudo en /api/docs.json)
// Al agregar un endpoint nuevo, agrégalo también en `paths`.

const tienda = { name: "tienda", in: "path", required: true, schema: { type: "string", example: "S001" }, description: "ID de tienda (S###)" };
const tiendaQ = { name: "tienda", in: "query", schema: { type: "string", example: "S001" }, description: "Filtra por tienda; sin valor = todas" };
const fecha = { name: "fecha", in: "query", schema: { type: "string", format: "date", example: "2026-09-30" }, description: "Sin valor = último día con datos" };
const desde = { name: "desde", in: "query", schema: { type: "string", format: "date", example: "2026-09-01" } };
const hasta = { name: "hasta", in: "query", schema: { type: "string", format: "date", example: "2026-09-30" } };
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
      Tienda: { type: "object", properties: {
        store_id: { type: "string" }, store_name: { type: "string" }, format: { type: "string" }, operator_type: { type: "string" },
        opening_time: { type: "string", nullable: true }, closing_time: { type: "string", nullable: true },
        site_id: { type: "string" }, site_name: { type: "string" }, site_type: { type: "string" }, region: { type: "string" }, traffic_tier: { type: "number" },
      } },
    },
  },
};
