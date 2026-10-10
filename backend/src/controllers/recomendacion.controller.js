import * as Servicio from "../services/recomendacion.service.js";
import * as Rec from "../models/recomendacion.model.js";
import { ok, asyncHandler } from "../utils/apiResponse.js";
import { tiendaOpcional } from "../utils/validar.js";
import { ApiError } from "../utils/apiError.js";

const idValido = (v) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) throw new ApiError(400, "id inválido");
  return n;
};
const precioValido = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0 || n > 100000) throw new ApiError(400, "precio inválido");
  return Math.round(n * 100) / 100;
};

// GET /api/recomendaciones/S001?regenerar=1
export const listar = asyncHandler(async (req, res) => {
  const tienda = tiendaOpcional(req.params.tienda);
  if (!tienda) throw new ApiError(400, "Falta la tienda");
  ok(res, await Servicio.obtenerOGenerar({ tienda, regenerar: req.query.regenerar === "1" }));
});

// POST /api/recomendaciones/:id/aceptar   body opcional: { "precio": 2.75 }
export const aceptar = asyncHandler(async (req, res) => {
  const precio = req.body?.precio != null ? precioValido(req.body.precio) : null;
  ok(res, await Rec.aceptar(idValido(req.params.id), precio));
});

export const rechazar = asyncHandler(async (req, res) => ok(res, await Rec.rechazar(idValido(req.params.id))));

// PATCH /api/recomendaciones/:id/precio   body: { "precio": 2.75 }
export const editarPrecio = asyncHandler(async (req, res) =>
  ok(res, await Rec.editarPrecio(idValido(req.params.id), precioValido(req.body?.precio))));
