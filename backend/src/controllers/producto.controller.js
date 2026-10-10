import * as Producto from "../models/producto.model.js";
import { ok, asyncHandler } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { enteroEnRango } from "../utils/validar.js";

export const listar = asyncHandler(async (req, res) => {
  const limite = enteroEnRango(req.query.limite, { min: 1, max: 500, defecto: 50 });
  const pagina = enteroEnRango(req.query.pagina, { min: 1, max: 10000, defecto: 1 });
  const { filas, total } = await Producto.listar({
    texto: req.query.q || null,
    departamento: req.query.departamento || null,
    categoria: req.query.categoria || null,
    limite,
    offset: (pagina - 1) * limite,
  });
  ok(res, filas, { total, pagina, limite });
});

export const obtener = asyncHandler(async (req, res) => {
  const sku = String(req.params.sku).trim().toUpperCase();
  const producto = await Producto.obtener(sku);
  if (!producto) throw new ApiError(404, `El producto ${sku} no existe`);
  ok(res, producto);
});

export const categorias = asyncHandler(async (req, res) => ok(res, await Producto.categorias()));
