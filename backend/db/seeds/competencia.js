// Carga precios de la competencia en la tabla precios_competencia.
//
//   npm run db:competencia -- --demo           genera precios de EJEMPLO (±20 % del precio propio)
//   npm run db:competencia -- precios.json     carga un archivo: [{ "sku", "competidor", "precio", "fecha"?, "fuente"? }]
//
// Los precios "demo" son inventados (fuente = 'demo'): sirven para probar el panel de precios,
// no son datos reales de ninguna tienda.

import fs from "node:fs";
import { createHash } from "node:crypto";
import { pool, query } from "../../src/config/db.config.js";
import * as Competencia from "../../src/models/competencia.model.js";

const arg = process.argv[2];
if (!arg) {
  console.error("Uso: npm run db:competencia -- --demo   |   npm run db:competencia -- archivo.json");
  process.exit(1);
}

let filas;
if (arg === "--demo") {
  const { rows } = await query(`SELECT sku, avg(unit_price) AS precio FROM v_precio_vigente GROUP BY sku`);
  const competidores = ["Competidor A", "Competidor B", "Competidor C"];
  const hoy = new Date().toISOString().slice(0, 10);
  filas = rows.flatMap((r) =>
    competidores.map((competidor) => {
      // factor estable entre 0.80 y 1.20 según sku + competidor (no cambia entre corridas)
      const h = createHash("sha1").update(r.sku + competidor).digest()[0] / 255;
      return { sku: r.sku, competidor, precio: Math.round(r.precio * (0.8 + 0.4 * h) * 100) / 100, fecha: hoy, fuente: "demo" };
    })
  );
} else {
  filas = JSON.parse(fs.readFileSync(arg, "utf8"));
  const hoy = new Date().toISOString().slice(0, 10);
  filas = filas.map((f) => ({ fecha: hoy, fuente: null, ...f }));
}

const guardados = await Competencia.cargar(filas);
console.log(`Listo: ${guardados} precios guardados (${filas.length - guardados} ignorados por SKU inexistente).`);
await pool.end();
