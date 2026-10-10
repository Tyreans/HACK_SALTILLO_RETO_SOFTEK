import { API_BASE_URL } from './apiConfig';

export async function sendAssistantMessage(message, sessionId) {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      ...(sessionId ? { sessionId } : {}),
    }),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMessage = typeof data.error === 'string'
      ? data.error
      : data.error?.message || data.message;
    throw new Error(errorMessage || `El asistente respondió con error ${response.status}.`);
  }
  if (typeof data.response !== 'string' || !data.response.trim()) {
    throw new Error('El asistente devolvió una respuesta vacía.');
  }

  return data;
}
