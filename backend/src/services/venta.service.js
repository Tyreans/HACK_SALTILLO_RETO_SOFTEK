import * as Venta from "../models/venta.model.js";
import * as Tienda from "../models/tienda.model.js";
import { ApiError } from "../utils/apiError.js";

// Si no mandan fechas: últimos 30 días con datos
async function rango(desde, hasta) {
  const r = await Venta.rangoFechas();
  hasta = hasta || r.hasta;
  if (!desde) {
    const d = new Date(hasta + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() - 29);
    desde = d.toISOString().slice(0, 10);
  }
  if (desde > hasta) throw new ApiError(400, "'desde' no puede ser posterior a 'hasta'");
  return { desde, hasta };
}

async function validarTienda(tienda) {
  if (tienda && !(await Tienda.obtener(tienda))) throw new ApiError(404, `La tienda ${tienda} no existe`);
}

export async function serieDiaria({ desde, hasta, tienda }) {
  await validarTienda(tienda);
  const r = await rango(desde, hasta);
  return { ...r, tienda: tienda ?? null, filas: await Venta.seriePorDia({ ...r, tienda }) };
}

export async function topProductos({ desde, hasta, tienda, limite }) {
  await validarTienda(tienda);
  const r = await rango(desde, hasta);
  return { ...r, tienda: tienda ?? null, filas: await Venta.topProductos({ ...r, tienda, limite }) };
}

export const promociones = () => Venta.desempenoPromociones();
