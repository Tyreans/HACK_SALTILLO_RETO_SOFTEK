import { ApiError } from "./apiError.js";

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const TIENDA = /^S\d{3}$/;

export function fechaOpcional(valor, nombre = "fecha") {
  if (valor == null || valor === "") return null;
  if (!FECHA.test(valor)) throw new ApiError(400, `'${nombre}' debe tener formato YYYY-MM-DD`);
  return valor;
}

export function tiendaOpcional(valor) {
  if (valor == null || valor === "") return null;
  const id = String(valor).trim().toUpperCase();
  if (!TIENDA.test(id)) throw new ApiError(400, "'tienda' debe tener formato S### (p. ej. S001)");
  return id;
}

export function enteroEnRango(valor, { min, max, defecto }) {
  if (valor == null || valor === "") return defecto;
  const n = Number(valor);
  if (!Number.isInteger(n) || n < min || n > max) throw new ApiError(400, `Valor fuera de rango (${min}–${max})`);
  return n;
}
