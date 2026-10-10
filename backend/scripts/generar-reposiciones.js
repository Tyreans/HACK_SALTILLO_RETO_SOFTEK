import { pool } from "../src/config/db.config.js";
import { generarReposicionDiaria } from "../src/services/recomendacion.service.js";

function tiendaDeArgumentos(args) {
  let tienda = null;
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] !== "--tienda" || !args[i + 1]) {
      throw new Error("Uso: npm run recomendaciones:reposicion [-- --tienda ID_TIENDA]");
    }
    if (tienda) throw new Error("Indica --tienda como máximo una vez.");
    tienda = args[i + 1];
    i += 1;
  }
  return tienda;
}

try {
  const tienda = tiendaDeArgumentos(process.argv.slice(2));
  const resultado = await generarReposicionDiaria({ tienda });
  console.log(JSON.stringify(resultado, null, 2));
  if (resultado.errores.length) process.exitCode = 1;
} catch (error) {
  console.error("No se pudo completar la generación diaria de reposiciones:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
