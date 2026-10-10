import * as Competencia from "../models/competencia.model.js";
import { ok, asyncHandler } from "../utils/apiResponse.js";
import { fechaOpcional, tiendaOpcional } from "../utils/validar.js";
import { ApiError } from "../utils/apiError.js";

// GET /api/competencia/precios?sku=SKU-100694
export const listar = asyncHandler(async (req, res) => {
  const filas = await Competencia.ultimos({ sku: req.query.sku ? String(req.query.sku) : null });
  ok(res, filas, { total: filas.length });
});

// POST /api/competencia/precios   (header x-admin-key)
// body: { "precios": [{ "sku": "...", "competidor": "...", "precio": 2.9, "fecha": "2026-10-10", "fuente": "scraper" }] }
export const cargar = asyncHandler(async (req, res) => {
  const lista = req.body?.precios;
  if (!Array.isArray(lista) || !lista.length) throw new ApiError(400, "Envía { precios: [...] } con al menos un elemento");
  if (lista.length > 1000) throw new ApiError(400, "Máximo 1000 precios por petición");

  const hoy = new Date().toISOString().slice(0, 10);
  const filas = lista.map((p, i) => {
    const precio = Number(p?.precio);
    if (!p?.sku || !p?.competidor || !Number.isFinite(precio) || precio <= 0) {
      throw new ApiError(400, `Elemento ${i}: requiere sku, competidor y precio > 0`);
    }
    return {
      sku: String(p.sku), competidor: String(p.competidor).slice(0, 60), precio: Math.round(precio * 100) / 100,
      fecha: fechaOpcional(p.fecha, "fecha") || hoy, fuente: p.fuente ? String(p.fuente).slice(0, 30) : null,
    };
  });
  const guardados = await Competencia.cargar(filas);
  ok(res, { recibidos: filas.length, guardados, ignorados: filas.length - guardados });
});

// GET /api/competencia/rivales/S001   (sucursales rivales en el mismo sitio)
export const rivales = asyncHandler(async (req, res) => {
  const tienda = tiendaOpcional(req.params.tienda);
  if (!tienda) throw new ApiError(400, "Falta la tienda");
  const filas = await Competencia.rivalesDeTienda(tienda);
  ok(res, filas, { total: filas.length });
});

// GET /api/competencia/comparar/S001?sku=SKU-100694&q=donut&limite=20
export const comparar = asyncHandler(async (req, res) => {
  const tienda = tiendaOpcional(req.params.tienda);
  if (!tienda) throw new ApiError(400, "Falta la tienda");
  const limite = Math.min(Math.max(Number(req.query.limite) || 20, 1), 100);
  const filas = await Competencia.compararTienda({
    tienda, limite,
    sku: req.query.sku ? String(req.query.sku).trim().toUpperCase() : null,
    texto: req.query.q ? String(req.query.q).trim().slice(0, 60) : null,
  });
  ok(res, filas, { total: filas.length });
});
