import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const migration = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../db/migrations/006_backboard_purchase_orders.sql");
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("Falta DATABASE_URL en backend/.env.");
}

const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

try {
  await client.connect();
  await client.query(await fs.readFile(migration, "utf8"));
  console.log("Migración Backboard/órdenes aplicada correctamente.");
} catch (error) {
  console.error("No se pudo aplicar la migración Backboard/órdenes:", error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
