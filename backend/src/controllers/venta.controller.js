import * as Servicio from "../services/venta.service.js";
import { ok, asyncHandler } from "../utils/apiResponse.js";
import { fechaOpcional, tiendaOpcional, enteroEnRango } from "../utils/validar.js";

const rango = (q) => ({
  desde: fechaOpcional(q.desde, "desde"),
  hasta: fechaOpcional(q.hasta, "hasta"),
  tienda: tiendaOpcional(q.tienda),
});

// GET /api/ventas/diarias?tienda=S001&desde=2026-09-01&hasta=2026-09-30
export const diarias = asyncHandler(async (req, res) => {
  const { filas, ...meta } = await Servicio.serieDiaria(rango(req.query));
  ok(res, filas, meta);
});

// GET /api/ventas/top-productos?tienda=S001&limite=10
export const topProductos = asyncHandler(async (req, res) => {
  const limite = enteroEnRango(req.query.limite, { min: 1, max: 100, defecto: 10 });
  const { filas, ...meta } = await Servicio.topProductos({ ...rango(req.query), limite });
  ok(res, filas, meta);
});

// GET /api/promociones
export const promociones = asyncHandler(async (req, res) => ok(res, await Servicio.promociones()));
