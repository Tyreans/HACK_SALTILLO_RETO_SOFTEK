import * as Inventario from "../models/inventario.model.js";
import * as Tienda from "../models/tienda.model.js";
import { libroInventario } from "./excel.service.js";
import { ApiError } from "../utils/apiError.js";

async function validarTienda(tienda) {
  if (tienda && !(await Tienda.obtener(tienda))) throw new ApiError(404, `La tienda ${tienda} no existe`);
}

export async function inventarioDelDia({ fecha, tienda, categoria, soloAlertas }) {
  await validarTienda(tienda);
  fecha = fecha || (await Inventario.ultimaFecha());
  const filas = await Inventario.porDia({ fecha, tienda, categoria, soloAlertas });
  return { fecha, filas };
}

export async function resumen({ desde, hasta, tienda }) {
  await validarTienda(tienda);
  const ultima = await Inventario.ultimaFecha();
  hasta = hasta || ultima;
  desde = desde || hasta;
  if (desde > hasta) throw new ApiError(400, "'desde' no puede ser posterior a 'hasta'");
  return { desde, hasta, filas: await Inventario.resumenPorTienda({ desde, hasta, tienda }) };
}

export async function excelDelDia({ fecha, tienda, categoria, soloAlertas }) {
  const { fecha: f, filas } = await inventarioDelDia({ fecha, tienda, categoria, soloAlertas });
  if (!filas.length) throw new ApiError(404, "No hay inventario para esa tienda y fecha");
  const resumenDia = await Inventario.resumenPorTienda({ desde: f, hasta: f, tienda });
  const libro = await libroInventario({ fecha: f, filas, resumen: resumenDia });
  const nombre = `inventario_${tienda || "todas"}_${f}${soloAlertas ? "_alertas" : ""}.xlsx`;
  return { libro, nombre };
}
