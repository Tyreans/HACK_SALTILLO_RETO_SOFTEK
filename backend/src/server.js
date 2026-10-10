import { env } from "./config/env.config.js";
import { pool } from "./config/db.config.js";
import app from "./app.js";

try {
  await pool.query("SELECT 1");
  console.log("Conectado a PostgreSQL");
} catch (err) {
  console.error("No se pudo conectar a PostgreSQL. Revisa DATABASE_URL en backend/.env:", err.message);
  process.exit(1);
}

const server = app.listen(env.port, () => {
  console.log(`API Otzo lista en http://localhost:${env.port}/api`);
});

const cerrar = () => server.close(() => pool.end().then(() => process.exit(0)));
process.on("SIGINT", cerrar);
process.on("SIGTERM", cerrar);
