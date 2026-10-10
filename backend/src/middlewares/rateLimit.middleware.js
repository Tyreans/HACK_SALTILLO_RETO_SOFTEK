import { ApiError } from "../utils/apiError.js";

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
