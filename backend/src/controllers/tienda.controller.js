import * as Tienda from "../models/tienda.model.js";
import * as Kpi from "../models/kpi.model.js";
import * as Venta from "../models/venta.model.js";
import { ok, asyncHandler } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { tiendaOpcional, fechaOpcional } from "../utils/validar.js";

export const listar = asyncHandler(async (req, res) => {
  const tiendas = await Tienda.listar({ region: req.query.region || null });
  ok(res, tiendas, { total: tiendas.length });
});

export const obtener = asyncHandler(async (req, res) => {
  const id = tiendaOpcional(req.params.id);
  const tienda = await Tienda.obtener(id);
  if (!tienda) throw new ApiError(404, `La tienda ${id} no existe`);
  ok(res, { ...tienda, cierres: await Tienda.cierres(id) });
});

export const kpis = asyncHandler(async (req, res) => {
  const id = tiendaOpcional(req.params.id);
  if (!(await Tienda.obtener(id))) throw new ApiError(404, `La tienda ${id} no existe`);
  const r = await Venta.rangoFechas();
  const hasta = fechaOpcional(req.query.hasta, "hasta") || r.hasta;
  const desde = fechaOpcional(req.query.desde, "desde") || r.desde;
  ok(res, await Kpi.porTienda({ tienda: id, desde, hasta }), { desde, hasta });
});

// GET /api/tiendas/S001/promociones?vigentes=1
export const promociones = asyncHandler(async (req, res) => {
  const id = tiendaOpcional(req.params.id);
  if (!(await Tienda.obtener(id))) throw new ApiError(404, `La tienda ${id} no existe`);
  const filas = await Tienda.promociones(id, { soloVigentes: req.query.vigentes === "1" });
  ok(res, filas, { total: filas.length });
});
