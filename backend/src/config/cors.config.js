import { env } from "./env.config.js";

export const corsOptions = {
  origin: env.clientOrigin.split(",").map((o) => o.trim()),
  // Para que el front pueda leer el nombre del archivo al descargar el Excel
  exposedHeaders: ["Content-Disposition"],
};
