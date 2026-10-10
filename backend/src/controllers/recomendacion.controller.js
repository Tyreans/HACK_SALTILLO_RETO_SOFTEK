import * as Servicio from "../services/recomendacion.service.js";
import * as Rec from "../models/recomendacion.model.js";
import * as Memoria from "../services/memoria.service.js";
import { ok, asyncHandler } from "../utils/apiResponse.js";
import { tiendaOpcional } from "../utils/validar.js";
import { ApiError } from "../utils/apiError.js";

const idValido = (v) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) throw new ApiError(400, "id inválido");
  return n;
};
const numero = (v, nombre, min, max, entero = false) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max || (entero && !Number.isInteger(n))) {
    throw new ApiError(400, `'${nombre}' debe ser ${entero ? "un entero" : "un número"} entre ${min} y ${max}`);
  }
  return entero ? n : Math.round(n * 100) / 100;
};
const tipoValido = (v, obligatorio = false) => {
  if (v == null || v === "") {
    if (obligatorio) throw new ApiError(400, `Falta 'tipo' (${Rec.TIPOS.join(", ")})`);
    return null;
  }
  if (!Rec.TIPOS.includes(v)) throw new ApiError(400, `'tipo' debe ser: ${Rec.TIPOS.join(", ")}`);
  return v;
};

// Solo los campos que vengan en el cuerpo; el modelo valida que correspondan al tipo
function ajustes(body) {
  const a = {};
  if (body?.cantidad != null) a.cantidad = numero(body.cantidad, "cantidad", 1, 100000, true);
  if (body?.descuento_pct != null) a.descuento_pct = numero(body.descuento_pct, "descuento_pct", 1, 90);
  const p = body?.precio ?? body?.precio_propuesto;
  if (p != null) a.precio = numero(p, "precio", 0.01, 100000);
  return a;
}

// El agente aprende de cada decisión. No debe romper la respuesta si falla.
function avisarAlAgente(evento, f) {
  Memoria.registrarDecision({
    evento, tienda: f.store_id, tipo: f.tipo, sku: f.sku, producto: f.producto, origen: f.origen,
    propuesta_original: f.propuesta_original,
    final: { cantidad: f.cantidad, descuento_pct: f.descuento_pct, precio_propuesto: f.precio_propuesto },
    motivo_rechazo: f.motivo_rechazo,
  }).catch((e) => console.error("Memoria: no se pudo registrar la decisión:", e.message));
}

// GET /api/recomendaciones/S001?tipo=reposicion&regenerar=1
export const listar = asyncHandler(async (req, res) => {
  const tienda = tiendaOpcional(req.params.tienda);
  if (!tienda) throw new ApiError(400, "Falta la tienda");
  const filas = await Servicio.obtener({
    tienda, tipo: tipoValido(req.query.tipo), regenerar: req.query.regenerar === "1",
  });
  ok(res, filas, { total: filas.length });
});

// POST /api/recomendaciones   (opción que agrega el gerente)
export const crear = asyncHandler(async (req, res) => {
  const b = req.body ?? {};
  const tienda = tiendaOpcional(b.tienda);
  if (!tienda) throw new ApiError(400, "Falta la tienda");
  const sku = String(b.sku ?? "").trim();
  if (!sku) throw new ApiError(400, "Falta 'sku'");
  const f = await Servicio.crearManual({
    tienda, tipo: tipoValido(b.tipo, true), sku, ...ajustes(b),
    motivo: b.motivo ? String(b.motivo).slice(0, 200) : null,
  });
  avisarAlAgente("agregada", f);
  res.status(201);
  ok(res, f);
});

// PATCH /api/recomendaciones/:id   body: { cantidad } | { descuento_pct } | { precio }
export const editar = asyncHandler(async (req, res) => {
  const a = ajustes(req.body);
  if (!Object.keys(a).length) throw new ApiError(400, "Indica qué cambiar: cantidad, descuento_pct o precio");
  const f = await Rec.editar(idValido(req.params.id), a);
  avisarAlAgente("editada", f);
  ok(res, f);
});

// POST /api/recomendaciones/:id/aceptar   body opcional con los mismos campos de editar
export const aceptar = asyncHandler(async (req, res) => {
  const f = await Rec.aceptar(idValido(req.params.id), ajustes(req.body));
  avisarAlAgente("aceptada", f);
  ok(res, f);
});

// POST /api/recomendaciones/:id/rechazar   body opcional: { motivo }
export const rechazar = asyncHandler(async (req, res) => {
  const motivo = req.body?.motivo ? String(req.body.motivo).trim().slice(0, 200) : null;
  const f = await Rec.rechazar(idValido(req.params.id), motivo);
  avisarAlAgente("rechazada", f);
  ok(res, f);
});
