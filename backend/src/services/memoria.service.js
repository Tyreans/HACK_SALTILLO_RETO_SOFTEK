import { env } from "../config/env.config.js";
import { pool } from "../config/db.config.js";

const API_URL = "https://app.backboard.io/api/threads/messages";
// Corto: el gerente está esperando las sugerencias en pantalla
const TIMEOUT_MS = 8_000;
const activa = () => Boolean(env.backboardApiKey);

async function solicitarBackboard(body) {
  if (!env.backboardApiKey) {
    throw new Error("Falta BACKBOARD_API_KEY en backend/.env para usar la memoria Backboard.");
  }

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "X-API-Key": env.backboardApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...body, memory: "Auto" }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Backboard respondió HTTP ${response.status}: ${text.slice(0, 300)}`);
  }

  let resultado;
  try {
    resultado = JSON.parse(text);
  } catch {
    throw new Error("Backboard devolvió una respuesta que no es JSON válido.");
  }
  return resultado;
}

async function enviar(tienda, content) {
  const client = await pool.connect();
  let transaccionAbierta = false;
  let clientLiberado = false;
  try {
    await client.query("BEGIN");
    transaccionAbierta = true;
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`backboard:${tienda}`]);
    const { rows } = await client.query(
      "SELECT assistant_id, thread_id FROM backboard_store_memory WHERE store_id = $1",
      [tienda]
    );

    if (rows[0]) {
      const memoria = rows[0];
      await client.query("COMMIT");
      transaccionAbierta = false;
      client.release();
      clientLiberado = true;
      const response = await solicitarBackboard({
        thread_id: memoria.thread_id,
        assistant_id: memoria.assistant_id,
        content,
      });
      await pool.query("UPDATE backboard_store_memory SET updated_at = now() WHERE store_id = $1", [tienda]);
      return response.content;
    }

    const response = await solicitarBackboard({ content });
    if (typeof response.thread_id !== "string" || typeof response.assistant_id !== "string") {
      throw new Error("Backboard no devolvió thread_id y assistant_id al crear la memoria de la tienda.");
    }
    await client.query(
      `INSERT INTO backboard_store_memory (store_id, assistant_id, thread_id)
       VALUES ($1, $2, $3)`,
      [tienda, response.assistant_id, response.thread_id]
    );
    await client.query("COMMIT");
    transaccionAbierta = false;
    return response.content;
  } catch (error) {
    if (transaccionAbierta) await client.query("ROLLBACK");
    throw error;
  } finally {
    if (!clientLiberado) client.release();
  }
}

/**
 * Texto con lo que el agente recuerda del negocio (preferencias del gerente, patrones).
 * Se agrega al prompt de Gemini al redactar las sugerencias.
 * @param {{ tienda: string, tipo: "reposicion"|"promocion"|"precio" }} parametros
 * @returns {Promise<string>} Contexto relevante devuelto por Backboard
 */
export async function contexto({ tienda, tipo }) {
  if (!activa()) return ""; // sin BACKBOARD_API_KEY el agente sigue aprendiendo del historial en la base
  if (!tienda || !tipo) throw new Error("Se requiere tienda y tipo para recuperar la memoria Backboard.");
  const response = await enviar(
    tienda,
    `Resume en español, en máximo 120 palabras, las preferencias del gerente y patrones útiles para recomendaciones de ${tipo}. ` +
      `Usa solo recuerdos guardados de esta tienda. Si no hay recuerdos relevantes, responde exactamente: Sin preferencias previas relevantes.`
  );
  if (typeof response !== "string" || !response.trim()) {
    throw new Error("Backboard no devolvió texto de contexto.");
  }
  return response.trim();
}

/**
 * Se llama después de cada decisión del gerente. Aquí se guarda como memoria.
 * @param {{
 *   evento: "aceptada"|"rechazada"|"editada"|"agregada",
 *   tienda: string, tipo: string, sku: string, producto: string,
 *   origen: "agente"|"gerente",
 *   propuesta_original: { cantidad, descuento_pct, precio_propuesto },
 *   final: { cantidad, descuento_pct, precio_propuesto },
 *   motivo_rechazo: string|null
 * }} decision
 */
export async function registrarDecision(decision) {
  if (!activa()) return;
  if (!decision?.tienda || !decision?.evento || !decision?.tipo || !decision?.sku) {
    throw new Error("La decisión requiere tienda, evento, tipo y SKU para guardarse en Backboard.");
  }
  const response = await enviar(
    decision.tienda,
    `Registra como aprendizaje de negocio la siguiente decisión del gerente. ` +
      `No la conviertas en una regla absoluta si solo ocurrió una vez. ` +
      `${JSON.stringify(decision)}`
  );
  if (typeof response !== "string" || !response.trim()) {
    throw new Error("Backboard no confirmó texto al registrar la decisión.");
  }
}
