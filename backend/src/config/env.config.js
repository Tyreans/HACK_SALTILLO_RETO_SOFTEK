import "dotenv/config";

// Falla rápido si falta algo crítico al arrancar
const requeridas = ["DATABASE_URL"];
const faltantes = requeridas.filter((k) => !process.env[k]);
if (faltantes.length) {
  console.error(`Faltan variables en backend/.env: ${faltantes.join(", ")} (copia .env.example a .env)`);
  process.exit(1);
}

export const env = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  databaseUrl: process.env.DATABASE_URL,
  dbSsl: process.env.DB_SSL === "true",
  geminiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL || "gemini-2.0-flash",
  elevenKey: process.env.ELEVENLABS_API_KEY,
  elevenVoice: process.env.ELEVENLABS_VOICE_ID,
  elevenModel: process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2",
};
