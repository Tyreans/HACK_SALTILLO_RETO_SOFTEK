// Crea las tablas en Tiger (PostgreSQL) y carga los CSV limpios.
//
// Uso (desde backend/):
//   1. npm run db:limpiar   (genera db/datos_limpios)
//   2. npm run db:cargar    (necesita DATABASE_URL en backend/.env)
//   3. npm run db:rivales   (opcional: base de rivales de ejemplo)
//
// Aplica TODAS las migraciones en orden (001, 002, 003, ...): no hace falta correrlas a mano.
//
// Se puede volver a correr cuantas veces quieran: borra y recrea las tablas.

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import pg from "pg";
import copyStreams from "pg-copy-streams";

const { Client } = pg;
const copyFrom = copyStreams.from;
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(AQUI, "..", "datos_limpios");
const MIGRACIONES = path.join(AQUI, "..", "migrations");

// El orden importa: primero catálogos, luego tablas que los referencian
const TABLAS = [
  "sites", "suppliers", "calendar", "stores", "store_closures", "products",
  "product_barcodes", "promotions", "prices", "purchase_orders",
  "sales_daily", "inventory_daily", "store_daily_kpis", "weather_daily", "rechazos",
];

if (!process.env.DATABASE_URL) {
  console.error("Falta DATABASE_URL en el archivo .env (la copias de Tiger Console → tu servicio → Connect).");
  process.exit(1);
}
if (!fs.existsSync(path.join(DIR, "sales_daily.csv"))) {
  console.error("No encuentro db/datos_limpios. Corre primero: npm run db:limpiar");
  process.exit(1);
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});
await client.connect();
console.log("Conectado a la base de datos");

try {
  console.log("Creando tablas...");
  client.on("notice", (n) => console.log("  ", n.message));
  // Lo de la app (recomendaciones, rivales) depende de las tablas del dataset: se borra primero
  await client.query("DROP TABLE IF EXISTS recomendaciones CASCADE");
  await client.query("DROP SCHEMA IF EXISTS rivales CASCADE");
  await client.query(fs.readFileSync(path.join(MIGRACIONES, "001_schema_otzo.sql"), "utf8"));

  for (const tabla of TABLAS) {
    const archivo = path.join(DIR, `${tabla}.csv`);
    const columnas = fs.readFileSync(archivo, "utf8").split("\n", 1)[0].trim();
    const inicio = Date.now();
    const copia = client.query(copyFrom(`COPY ${tabla} (${columnas}) FROM STDIN WITH (FORMAT csv, HEADER true)`));
    await pipeline(fs.createReadStream(archivo), copia);
    console.log(`  ${tabla}: ${copia.rowCount} filas (${((Date.now() - inicio) / 1000).toFixed(1)} s)`);
  }

  // Resto de migraciones (002, 003, ...) en orden, ya con los datos cargados
  const extras = fs.readdirSync(MIGRACIONES).filter((f) => /^\d+_.*\.sql$/.test(f) && !f.startsWith("001_")).sort();
  for (const f of extras) {
    await client.query(fs.readFileSync(path.join(MIGRACIONES, f), "utf8"));
    console.log(`  migración ${f} aplicada`);
  }

  await client.query("ANALYZE");
  const { rows } = await client.query(
    "SELECT count(*)::int AS ventas, round(sum(net_sales))::bigint AS total FROM sales_daily"
  );
  console.log(`Listo. ${rows[0].ventas} ventas cargadas, total $${Number(rows[0].total).toLocaleString()} USD`);
  console.log("Siguiente (opcional): npm run db:rivales  y  npm run db:competencia -- --demo");
} catch (err) {
  console.error("Error durante la carga:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
