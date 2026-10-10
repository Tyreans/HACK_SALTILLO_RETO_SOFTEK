import { query } from "../config/db.config.js";
import * as Producto from "../models/producto.model.js";
import * as Tienda from "../models/tienda.model.js";
import * as Competencia from "../models/competencia.model.js";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const databaseTools = [
  {
    name: "consultar_rango_datos",
    description: "Obtiene los periodos disponibles de ventas e inventario. Úsalo para interpretar fechas relativas respecto de los datos cargados.",
    parametersJsonSchema: { type: "object", properties: {} },
  },
  {
    name: "resumir_ventas",
    description: "Consulta ventas netas, unidades y descuentos. Puede agrupar por total, día, tienda o categoría. Sin fechas, consulta todo el historial disponible.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        desde: { type: "string", description: "Fecha inicial YYYY-MM-DD, opcional." },
        hasta: { type: "string", description: "Fecha final YYYY-MM-DD, opcional." },
        tienda: { type: "string", description: "ID de tienda, opcional." },
        agruparPor: { type: "string", enum: ["total", "dia", "tienda", "categoria"] },
      },
    },
  },
  {
    name: "productos_mas_vendidos",
    description: "Lista los productos con más unidades vendidas en un periodo. Sin fechas, consulta todo el historial disponible.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        desde: { type: "string", description: "Fecha inicial YYYY-MM-DD, opcional." },
        hasta: { type: "string", description: "Fecha final YYYY-MM-DD, opcional." },
        tienda: { type: "string", description: "ID de tienda, opcional." },
        limite: { type: "integer", description: "Cantidad de resultados entre 1 y 20." },
      },
    },
  },
  {
    name: "consultar_inventario",
    description: "Consulta el inventario diario y sus alertas. Sin fecha, usa la fecha más reciente cargada.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        fecha: { type: "string", description: "Fecha YYYY-MM-DD, opcional." },
        tienda: { type: "string", description: "ID de tienda, opcional." },
        categoria: { type: "string", description: "Categoría, opcional." },
        soloAlertas: { type: "boolean", description: "Si es true, devuelve solo productos con quiebre, cero existencias o merma." },
      },
    },
  },
  {
    name: "buscar_productos",
    description: "Busca productos por nombre o SKU, opcionalmente filtrando por departamento o categoría.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        texto: { type: "string", description: "Nombre parcial o SKU, opcional." },
        departamento: { type: "string" },
        categoria: { type: "string" },
        limite: { type: "integer", description: "Cantidad de resultados entre 1 y 30." },
      },
    },
  },
  {
    name: "comparar_con_rivales",
    description: "Compara los precios de una tienda contra las tiendas rivales del mismo aeropuerto o estación (base de rivales). Úsalo para preguntas de competencia, precios caros o baratos, o qué hacen los rivales.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        tienda: { type: "string", description: "ID de tienda, obligatorio (p. ej. S001)." },
        texto: { type: "string", description: "Nombre parcial del producto, opcional." },
        sku: { type: "string", description: "SKU exacto, opcional." },
        limite: { type: "integer", description: "Cantidad de productos entre 1 y 20." },
      },
      required: ["tienda"],
    },
  },
  {
    name: "listar_rivales",
    description: "Lista las sucursales rivales que hay en el mismo sitio que una tienda, con su cadena y posicionamiento (premium, económica, conveniencia).",
    parametersJsonSchema: {
      type: "object",
      properties: { tienda: { type: "string", description: "ID de tienda, obligatorio." } },
      required: ["tienda"],
    },
  },
  {
    name: "listar_tiendas",
    description: "Lista tiendas y sus sitios, opcionalmente filtrados por región.",
    parametersJsonSchema: {
      type: "object",
      properties: { region: { type: "string" } },
    },
  },
];

function optionalText(value, name, maxLength = 100) {
  if (value == null || value === "") return null;
  if (typeof value !== "string" || value.length > maxLength) {
    throw new Error(`El filtro ${name} no es válido.`);
  }
  return value.trim() || null;
}

function validDate(value, name) {
  if (value == null || value === "") return null;
  if (
    typeof value !== "string" ||
    !DATE_PATTERN.test(value) ||
    Number.isNaN(Date.parse(`${value}T00:00:00Z`)) ||
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value
  ) {
    throw new Error(`La fecha ${name} debe tener el formato YYYY-MM-DD.`);
  }
  return value;
}

function resultLimit(value, fallback, maximum) {
  if (value == null) return fallback;
  if (!Number.isInteger(value) || value < 1 || value > maximum) {
    throw new Error(`El límite debe ser un entero entre 1 y ${maximum}.`);
  }
  return value;
}

async function getDateRange(table, storeId = null) {
  const { rows } = await query(
    `SELECT min(date)::text AS desde, max(date)::text AS hasta FROM ${table}
      WHERE ($1::text IS NULL OR store_id = $1)`,
    [storeId]
  );
  return rows[0];
}

async function resolveSalesRange(args) {
  let desde = validDate(args.desde, "desde");
  let hasta = validDate(args.hasta, "hasta");
  const range = await getDateRange("sales_daily", optionalText(args.tienda, "tienda"));
  if (!range.hasta) return { desde: null, hasta: null };

  hasta ||= range.hasta;
  desde ||= range.desde;
  if (desde > hasta) throw new Error("La fecha inicial no puede ser posterior a la fecha final.");
  return { desde, hasta };
}

async function summarizeSales(args) {
  const { desde, hasta } = await resolveSalesRange(args);
  if (!desde) return { mensaje: "No hay ventas cargadas en la base de datos.", filas: [] };

  const tienda = optionalText(args.tienda, "tienda");
  const agruparPor = args.agruparPor ?? "total";
  const agrupaciones = new Map([
    ["total", { seleccion: "'total' AS grupo", columna: null }],
    ["dia", { seleccion: "v.date::text AS grupo", columna: "v.date" }],
    ["tienda", { seleccion: "v.store_id AS grupo, max(s.store_name) AS nombre", columna: "v.store_id" }],
    ["categoria", { seleccion: "p.category AS grupo", columna: "p.category" }],
  ]);
  const agrupacion = agrupaciones.get(agruparPor);
  if (!agrupacion) throw new Error("El tipo de agrupación de ventas no es válido.");

  const groupBy = agrupacion.columna ? `GROUP BY ${agrupacion.columna}` : "";
  const orderBy = agruparPor === "dia" ? "grupo ASC" : "venta_neta DESC";
  const { rows } = await query(
    `SELECT ${agrupacion.seleccion},
            sum(v.units_sold) AS unidades,
            round(sum(v.net_sales), 2) AS venta_neta,
            round(sum(v.discount_amount), 2) AS descuentos
       FROM sales_daily v
       JOIN products p USING (sku)
       JOIN stores s USING (store_id)
      WHERE v.date BETWEEN $1 AND $2
        AND ($3::text IS NULL OR v.store_id = $3)
      ${groupBy}
      ORDER BY ${orderBy}
      LIMIT 100`,
    [desde, hasta, tienda]
  );
  return { desde, hasta, filas: rows };
}

async function topProducts(args) {
  const { desde, hasta } = await resolveSalesRange(args);
  if (!desde) return { mensaje: "No hay ventas cargadas en la base de datos.", filas: [] };

  const tienda = optionalText(args.tienda, "tienda");
  const limite = resultLimit(args.limite, 10, 20);
  const { rows } = await query(
    `SELECT v.sku, p.product_name AS producto, p.category AS categoria,
            sum(v.units_sold) AS unidades, round(sum(v.net_sales), 2) AS venta_neta
       FROM sales_daily v
       JOIN products p USING (sku)
      WHERE v.date BETWEEN $1 AND $2
        AND ($3::text IS NULL OR v.store_id = $3)
      GROUP BY v.sku, p.product_name, p.category
      ORDER BY unidades DESC, venta_neta DESC
      LIMIT $4`,
    [desde, hasta, tienda, limite]
  );
  return { desde, hasta, filas: rows };
}

async function inventory(args) {
  const fecha = validDate(args.fecha, "fecha");
  const tienda = optionalText(args.tienda, "tienda");
  const categoria = optionalText(args.categoria, "categoría");
  if (args.soloAlertas != null && typeof args.soloAlertas !== "boolean") {
    throw new Error("El filtro soloAlertas debe ser verdadero o falso.");
  }
  const soloAlertas = args.soloAlertas === true;
  const { rows: latestRows } = await query(
    `SELECT max(date)::text AS fecha FROM inventory_daily
      WHERE ($1::text IS NULL OR store_id = $1)`,
    [tienda]
  );
  const fechaConsulta = fecha || latestRows[0].fecha;
  if (!fechaConsulta) return { mensaje: "No hay inventario cargado en la base de datos.", filas: [] };

  const { rows } = await query(
    `SELECT date::text AS fecha, store_id AS tienda, store_name, site_name AS sitio,
            sku, product_name AS producto, category AS categoria,
            opening_qty AS inicial, received_qty AS recibido, units_sold AS vendidos,
            expired_qty AS caducado, damaged_qty AS danado, closing_qty AS cierre,
            on_order_qty AS en_camino, stockout_hours AS horas_sin_stock, valor_inventario
       FROM v_inventario_diario
      WHERE date = $1
        AND ($2::text IS NULL OR store_id = $2)
        AND ($3::text IS NULL OR category = $3)
        AND (NOT $4 OR stockout_hours > 0 OR closing_qty = 0 OR expired_qty > 0)
      ORDER BY stockout_hours DESC, closing_qty, store_id, product_name
      LIMIT 50`,
    [fechaConsulta, tienda, categoria, soloAlertas]
  );
  return { fecha: fechaConsulta, filas: rows };
}

async function searchProducts(args) {
  const limite = resultLimit(args.limite, 10, 30);
  return Producto.listar({
    texto: optionalText(args.texto, "texto de búsqueda"),
    departamento: optionalText(args.departamento, "departamento"),
    categoria: optionalText(args.categoria, "categoría"),
    limite,
    offset: 0,
  });
}

export async function executeDatabaseTool(name, args = {}) {
  switch (name) {
    case "consultar_rango_datos": {
      const [ventas, inventario] = await Promise.all([
        getDateRange("sales_daily"),
        getDateRange("inventory_daily"),
      ]);
      return { ventas, inventario };
    }
    case "resumir_ventas":
      return summarizeSales(args);
    case "productos_mas_vendidos":
      return topProducts(args);
    case "consultar_inventario":
      return inventory(args);
    case "buscar_productos":
      return searchProducts(args);
    case "comparar_con_rivales": {
      const tienda = optionalText(args.tienda, "tienda");
      if (!tienda) throw new Error("Indica la tienda para comparar con los rivales.");
      const filas = await Competencia.compararTienda({
        tienda,
        sku: optionalText(args.sku, "sku"),
        texto: optionalText(args.texto, "texto"),
        limite: resultLimit(args.limite, 10, 20),
      });
      return filas.length ? { tienda, filas } : { tienda, mensaje: "No hay datos de rivales para esa tienda o producto.", filas };
    }
    case "listar_rivales": {
      const tienda = optionalText(args.tienda, "tienda");
      if (!tienda) throw new Error("Indica la tienda.");
      return { tienda, rivales: await Competencia.rivalesDeTienda(tienda) };
    }
    case "listar_tiendas":
      return Tienda.listar({ region: optionalText(args.region, "región") });
    default:
      throw new Error(`Gemini solicitó una herramienta de datos no reconocida: ${name}.`);
  }
}
