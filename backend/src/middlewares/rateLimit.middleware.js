import { timingSafeEqual } from "node:crypto";
import { ApiError } from "../utils/apiError.js";
import { env } from "../config/env.config.js";

export const limitar = ({ max, ventanaMs }) => {
  const golpes = new Map();
  return (req, res, next) => {
    const ahora = Date.now();
    const recientes = (golpes.get(req.ip) ?? []).filter((t) => ahora - t < ventanaMs);
    if (recientes.length >= max) return next(new ApiError(429, "Demasiadas peticiones, espera un momento"));
    recientes.push(ahora);
    golpes.set(req.ip, recientes);
    next();
  };
};

// Aplica un middleware solo cuando se cumple la condición (p. ej. limitar solo ?regenerar=1)
export const limitarSi = (condicion, middleware) => (req, res, next) =>
  condicion(req) ? middleware(req, res, next) : next();

// Para endpoints que carga un script (no el navegador): header x-admin-key = ADMIN_KEY
export const requiereClaveAdmin = (req, res, next) => {
  if (!env.adminKey) return next(new ApiError(503, "Carga deshabilitada: define ADMIN_KEY en backend/.env"));
  const dada = Buffer.from(String(req.get("x-admin-key") ?? ""));
  const real = Buffer.from(env.adminKey);
  if (dada.length !== real.length || !timingSafeEqual(dada, real)) return next(new ApiError(401, "Clave inválida"));
  next();
};
