import * as Servicio from "../services/inventario.service.js";
import { ok, asyncHandler } from "../utils/apiResponse.js";
import { fechaOpcional, tiendaOpcional } from "../utils/validar.js";

const filtros = (q) => ({
  fecha: fechaOpcional(q.fecha),
  tienda: tiendaOpcional(q.tienda),
  categoria: q.categoria || null,
  soloAlertas: q.alertas === "true" || q.alertas === "1",
});

// GET /api/inventario?tienda=S001&fecha=2026-09-30&categoria=Bakery&alertas=true
export const delDia = asyncHandler(async (req, res) => {
  const { fecha, filas } = await Servicio.inventarioDelDia(filtros(req.query));
  ok(res, filas, { fecha, total: filas.length });
});

// GET /api/inventario/resumen?desde=2026-09-01&hasta=2026-09-30&tienda=S001
export const resumen = asyncHandler(async (req, res) => {
  const { desde, hasta, filas } = await Servicio.resumen({
    desde: fechaOpcional(req.query.desde, "desde"),
    hasta: fechaOpcional(req.query.hasta, "hasta"),
    tienda: tiendaOpcional(req.query.tienda),
  });
  ok(res, filas, { desde, hasta });
});

// GET /api/inventario/export  (mismos filtros que /api/inventario) -> descarga .xlsx
export const exportarExcel = asyncHandler(async (req, res) => {
  const { libro, nombre } = await Servicio.excelDelDia(filtros(req.query));
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${nombre}"`);
  await libro.xlsx.write(res);
  res.end();
});
