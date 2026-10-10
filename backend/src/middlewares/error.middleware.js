import { ApiError } from "../utils/apiError.js";
import { env } from "../config/env.config.js";

export function notFound(req, res, next) {
  next(new ApiError(404, `Ruta no encontrada: ${req.method} ${req.originalUrl}`));
}

// Manejador global: nunca expone detalles internos de la base al cliente
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const status = err instanceof ApiError ? err.status : 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    success: false,
    error: {
      message: status >= 500 ? "Error interno del servidor" : err.message,
      ...(err.details ? { details: err.details } : {}),
      ...(env.nodeEnv === "development" && status >= 500 ? { debug: err.message } : {}),
    },
  });
}
