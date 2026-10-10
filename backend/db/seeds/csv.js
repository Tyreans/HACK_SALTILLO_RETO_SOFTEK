import fs from "node:fs";
import path from "node:path";

// Lector de CSV sin dependencias. Soporta campos entre comillas con comas dentro.
export function leerCsv(ruta) {
  const texto = fs.readFileSync(ruta, "utf8").replace(/^﻿/, "");
  const filas = [];
  let campo = "", fila = [], enComillas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (enComillas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') enComillas = false;
      else campo += c;
    } else if (c === '"') enComillas = true;
    else if (c === ",") { fila.push(campo); campo = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i++;
      fila.push(campo); filas.push(fila); fila = []; campo = "";
    } else campo += c;
  }
  if (campo || fila.length) { fila.push(campo); filas.push(fila); }

  const encabezados = filas.shift().map((h) => h.trim());
  return filas
    .filter((f) => f.length > 1)
    .map((f) => Object.fromEntries(encabezados.map((h, i) => [h, (f[i] ?? "").trim()])));
}

export const DIR_DATOS = path.resolve(process.env.DATA_DIR || "datos");
