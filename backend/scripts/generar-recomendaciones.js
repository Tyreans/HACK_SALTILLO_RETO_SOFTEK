// Genera las recomendaciones del día para todas las tiendas, sin esperar a que alguien abra la tabla.
// Pensado para correrlo con cron en el servidor (ver docs/api/README.md).
//
//   npm run recomendaciones:generar                          todas las tiendas, los 3 tipos
//   npm run recomendaciones:generar -- --tienda=S001         una sola tienda
//   npm run recomendaciones:generar -- --tipo=reposicion     un solo tipo
//   npm run recomendaciones:generar -- --regenerar           descarta las pendientes del agente y recalcula
//
// Sin --regenerar solo calcula lo que hoy aún no existe, así que se puede correr varias veces
// sin gastar Gemini de más ni pisar lo que el gerente ya editó.

import { pool, query } from "../src/config/db.config.js";
import * as Servicio from "../src/services/recomendacion.service.js";
import * as Rec from "../src/models/recomendacion.model.js";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")).map(([k, v]) => [k, v ?? true])
);
const PAUSA_MS = Number(process.env.GEMINI_PAUSA_MS) || 1500; // pausa entre llamadas que usaron Gemini
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const hora = () => new Date().toISOString();

const tipos = args.tipo ? [args.tipo] : Rec.TIPOS;
if (tipos.some((t) => !Rec.TIPOS.includes(t))) {
  console.error(`--tipo debe ser uno de: ${Rec.TIPOS.join(", ")}`);
  process.exit(1);
}
let rows;
try {
  ({ rows } = await query(
    `SELECT store_id FROM stores WHERE closed_date IS NULL AND ($1::text IS NULL OR store_id = $1) ORDER BY store_id`,
    [args.tienda ?? null]
  ));
} catch (e) {
  console.error(`[${hora()}] No se pudo leer la base de datos: ${e.message}`);
  process.exit(1);
}
if (!rows.length) {
  console.error("No hay tiendas que procesar");
  process.exit(1);
}

console.log(`[${hora()}] Inicio: ${rows.length} tienda(s) × ${tipos.length} tipo(s)${args.regenerar ? " (regenerar)" : ""}`);
let generadas = 0, omitidas = 0, sinSugerencias = 0, fallos = 0;

for (const { store_id: tienda } of rows) {
  for (const tipo of tipos) {
    try {
      const yaHabia = !args.regenerar && (await Rec.hayAgenteHoy(tienda, tipo));
      const filas = await Servicio.obtener({ tienda, tipo, regenerar: Boolean(args.regenerar) });
      if (yaHabia) { omitidas++; continue; }
      const nuevas = filas.filter((f) => f.origen === "agente").length;
      if (!nuevas) { sinSugerencias++; continue; } // nada que sugerir: no se llamó a Gemini, no hace falta pausa
      generadas++;
      console.log(`  ${tienda} ${tipo}: ${nuevas} fila(s)`);
      await dormir(PAUSA_MS);
    } catch (e) {
      fallos++;
      console.error(`  ${tienda} ${tipo}: ERROR ${e.message}`);
    }
  }
}

console.log(`[${hora()}] Fin: ${generadas} generadas, ${omitidas} ya existían, ${sinSugerencias} sin sugerencias, ${fallos} con error`);
await pool.end();
process.exit(fallos ? 1 : 0);
