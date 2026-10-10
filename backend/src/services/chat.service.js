import { GoogleGenAI } from '@google/genai';
import { databaseTools, executeDatabaseTool } from './chat-data.service.js';

const MODELS = [
  'gemini-3.8-flash',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
];
const MAX_ROUNDS = 3;
const ROUND_DELAY_MS = 1500;
const REQUEST_TIMEOUT_MS = 15000;
const MAX_HISTORY_MESSAGES = 6;
const MAX_TOOL_ROUNDS = 3;
const SESSION_TTL_MS = 30 * 60 * 1000;
const CHAT_CONFIG = {
  systemInstruction: `Eres el asistente de una tienda. Responde en español, con claridad y brevedad.
Usa las herramientas de datos para responder preguntas sobre ventas, inventario, productos, tiendas o precios de las tiendas rivales; no inventes cifras ni escribas SQL.
Las herramientas solo consultan datos. Si una pregunta requiere fechas relativas, consulta primero el rango disponible y cuenta desde la última fecha cargada, no desde la fecha actual.
Si faltan datos o no hay resultados, dilo claramente. Resume los resultados sin afirmar más de lo que muestran.`,
  tools: [{ functionDeclarations: databaseTools }],
};

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: { timeout: REQUEST_TIMEOUT_MS },
});

const chatSessions = new Map();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SWITCHABLE = new Set([404, 429, 500, 502, 503, 504]);
const isSwitchable = (err) =>
  SWITCHABLE.has(err.status) ||
  err.name === 'AbortError' ||
  err.name === 'TimeoutError' ||
  ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'].includes(err.code) ||
  err.cause?.code === 'ECONNRESET';

function trimHistory(history, maxMessages) {
  let trimmed = (history || []).slice(-maxMessages);
  while (trimmed.length && trimmed[0].role !== 'user') trimmed = trimmed.slice(1);
  return trimmed;
}

function createChat(modelIndex, history = []) {
  return ai.chats.create({ model: MODELS[modelIndex], history, config: CHAT_CONFIG });
}

async function sendWithTools(session, message) {
  let response = await session.chat.sendMessage({ message });

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const functionCalls = response.functionCalls;
    if (!functionCalls?.length) return response;

    const functionResponses = await Promise.all(
      functionCalls.map(async ({ name, args, id }) => {
        if (!name) throw new Error('Gemini devolvió una llamada de herramienta sin nombre.');
        const result = await executeDatabaseTool(name, args ?? {});
        return {
          functionResponse: {
            name,
            ...(id ? { id } : {}),
            response: { result },
          },
        };
      })
    );
    response = await session.chat.sendMessage({ message: functionResponses });
  }

  if (response.functionCalls?.length) {
    throw new Error('Gemini superó el límite de consultas a la base de datos por mensaje.');
  }
  return response;
}

export async function sendWithFailover(session, message) {
  let lastError;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    for (let i = 0; i < MODELS.length; i++) {
      const idx = (session.modelIndex + i) % MODELS.length;

      if (idx !== session.modelIndex) {
        const history = trimHistory(session.chat.getHistory(), MAX_HISTORY_MESSAGES);
        session.chat = createChat(idx, history);
        session.modelIndex = idx;
      }

      try {
        return await sendWithTools(session, message);
      } catch (err) {
        lastError = err;
        console.warn(
          `[ronda ${round + 1}/${MAX_ROUNDS}] ${MODELS[idx]} falló (${err.status ?? err.name ?? err.code}): ${String(err.message).slice(0, 120)}`
        );
        if (!isSwitchable(err)) throw err;
      }
    }

    if (round < MAX_ROUNDS - 1) {
      const wait = ROUND_DELAY_MS * (round + 1) + Math.random() * 500;
      console.warn(`Los ${MODELS.length} modelos fallaron. Reintentando en ${Math.round(wait)} ms...`);
      await sleep(wait);
    }
  }

  throw lastError;
}

export function toClientError(err) {
  switch (err.status) {
    case 429:
      return { status: 429, code: 'RATE_LIMIT', error: 'Estoy recibiendo muchas solicitudes. Intenta de nuevo en unos segundos.' };
    case 404:
    case 500:
    case 502:
    case 503:
    case 504:
      return { status: 503, code: 'BUSY', error: 'El asistente no está disponible en este momento. Intenta de nuevo en un momento.' };
    case 400:
      return { status: 400, code: 'BAD_REQUEST', error: 'No pude procesar ese mensaje. Intenta reformularlo.' };
    case 401:
    case 403:
      console.error('Config error (revisa GEMINI_API_KEY):', err.message);
      return { status: 500, code: 'CONFIG', error: 'El asistente no está disponible por un problema interno.' };
    default:
      if (isSwitchable(err)) {
        return { status: 503, code: 'BUSY', error: 'El asistente no está disponible en este momento. Intenta de nuevo en un momento.' };
      }
      return { status: 500, code: 'UNKNOWN', error: 'Ocurrió un error inesperado. Intenta de nuevo.' };
  }
}

export function getOrCreateSession(sessionId) {
  let id = sessionId;
  let session = id && chatSessions.get(id);

  if (!session) {
    id = Date.now().toString();
    session = { chat: createChat(0), modelIndex: 0, lastUsed: Date.now() };
    chatSessions.set(id, session);
  }
  session.lastUsed = Date.now();
  return { id, session };
}

export function deleteSession(sessionId) {
  chatSessions.delete(sessionId);
}

setInterval(() => {
  const now = Date.now();
  for (const [id, session] of chatSessions.entries()) {
    if (now - session.lastUsed > SESSION_TTL_MS) chatSessions.delete(id);
  }
}, 10 * 60 * 1000).unref();
