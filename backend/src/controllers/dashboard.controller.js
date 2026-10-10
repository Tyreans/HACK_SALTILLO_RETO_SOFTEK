import * as Servicio from "../services/dashboard.service.js";
import { ok, asyncHandler } from "../utils/apiResponse.js";
import { fechaOpcional, tiendaOpcional, enteroEnRango } from "../utils/validar.js";
import { ApiError } from "../utils/apiError.js";

// GET /api/dashboard/:tienda?dias=7&hasta=2026-09-30&limite=3
// Todo lo del panel izquierdo en una sola llamada.
export const resumen = asyncHandler(async (req, res) => {
  const tienda = tiendaOpcional(req.params.tienda);
  if (!tienda) throw new ApiError(400, "Falta la tienda");
  const data = await Servicio.resumenTienda({
    tienda,
    hasta: fechaOpcional(req.query.hasta, "hasta"),
    dias: enteroEnRango(req.query.dias, { min: 1, max: 90, defecto: 7 }),
    limite: enteroEnRango(req.query.limite, { min: 1, max: 20, defecto: 3 }),
  });
  ok(res, data);
});
