import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { env } from "../config/env.config.js";
import { asyncHandler } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";

// POST /api/voz   body: { "texto": "Hola" }  → audio/mpeg
const CACHE = path.join(os.tmpdir(), "otzo-audio");

export const hablar = asyncHandler(async (req, res) => {
  const texto = String(req.body?.texto ?? "").trim();
  if (!texto || texto.length > 400) throw new ApiError(400, "El texto debe tener entre 1 y 400 caracteres");
  if (!env.elevenKey || !env.elevenVoice) throw new ApiError(503, "ElevenLabs no está configurado");

  const archivo = path.join(CACHE, createHash("sha1").update(env.elevenVoice + texto).digest("hex") + ".mp3");
  let audio;
  try {
    audio = await fs.readFile(archivo); // misma frase = cero créditos
  } catch {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${env.elevenVoice}`, {
      method: "POST",
      headers: { "xi-api-key": env.elevenKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({ text: texto, model_id: env.elevenModel }),
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) throw new ApiError(502, "ElevenLabs no respondió");
    audio = Buffer.from(await r.arrayBuffer());
    await fs.mkdir(CACHE, { recursive: true });
    await fs.writeFile(archivo, audio);
  }
  res.set("Content-Type", "audio/mpeg").send(audio);
});
