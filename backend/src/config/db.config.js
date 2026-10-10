import pg from "pg";
import { env } from "./env.config.js";

// NUMERIC llega como texto por defecto; lo convertimos a número para el JSON
pg.types.setTypeParser(1700, (v) => (v == null ? null : Number(v)));
// DATE se queda como 'YYYY-MM-DD' (sin convertir a Date con zona horaria)
pg.types.setTypeParser(1082, (v) => v);
// COUNT/SUM de enteros (bigint) a número
pg.types.setTypeParser(20, (v) => (v == null ? null : Number(v)));

export const pool = new pg.Pool({
  connectionString: env.databaseUrl,
  ssl: env.dbSsl ? { rejectUnauthorized: false } : undefined,
  max: 10,
});

pool.on("error", (err) => console.error("Error inesperado en la conexión a PostgreSQL:", err.message));

// Atajo para consultas parametrizadas: query("SELECT ... WHERE id = $1", [id])
export const query = (texto, params) => pool.query(texto, params);
