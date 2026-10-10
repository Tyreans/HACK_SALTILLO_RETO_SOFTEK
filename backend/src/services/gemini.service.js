import { env } from "../config/env.config.js";
import { ApiError } from "../utils/apiError.js";

export async function generar({ sistema, prompt, json = false }) {
  if (!env.geminiKey) throw new ApiError(503, "Gemini no está configurado");
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${env.geminiModel}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": env.geminiKey },
      body: JSON.stringify({
        ...(sistema && { systemInstruction: { parts: [{ text: sistema }] } }),
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, ...(json && { responseMimeType: "application/json" }) },
      }),
      signal: AbortSignal.timeout(15000),
    }
  );
  if (!r.ok) {
    // Deja ver en la consola del backend la causa real (clave inválida, modelo retirado, límite...)
    const detalle = (await r.text().catch(() => "")).slice(0, 300);
    console.error(`Gemini ${env.geminiModel} respondió ${r.status}: ${detalle}`);
    throw new ApiError(502, `Gemini no respondió (${r.status})`);
  }
  const data = await r.json();
  const texto = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return json ? JSON.parse(texto) : texto.trim();
}
