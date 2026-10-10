import pg from "pg";
import { AsyncLocalStorage } from "node:async_hooks";
import { env } from "./env.config.js";

const queryTraceStorage = new AsyncLocalStorage();

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
export const query = async (texto, params) => {
  const trace = queryTraceStorage.getStore();
  const entry = trace ? { sql: texto, params: params ?? [] } : null;
  const startedAt = entry ? performance.now() : 0;

  if (entry) trace.queries.push(entry);

  try {
    const result = await pool.query(texto, params);
    if (entry) {
      entry.durationMs = Math.round(performance.now() - startedAt);
      entry.rowCount = result.rowCount;
    }
    return result;
  } catch (error) {
    if (entry) {
      entry.durationMs = Math.round(performance.now() - startedAt);
      entry.error = { code: error.code, message: error.message };
    }
    throw error;
  }
};

export async function captureQueryTrace(callback) {
  const trace = { queries: [] };
  try {
    return {
      result: await queryTraceStorage.run(trace, callback),
      queries: trace.queries,
    };
  } catch (error) {
    error.queryTrace = trace.queries;
    throw error;
  }
}
