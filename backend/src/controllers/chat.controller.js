import * as chatService from '../services/chat.service.js';

export const chat = async (req, res) => {
  try {
    const { message, sessionId } = req.body ?? {};

    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ code: 'EMPTY', error: 'Escribe un mensaje.' });
    }
    if (message.length > 4000) {
      return res.status(400).json({ code: 'TOO_LONG', error: 'El mensaje es demasiado largo (máx. 4000 caracteres).' });
    }

    const trimmedMessage = message.trim();
    const { id, session } = chatService.getOrCreateSession(sessionId);

    const response = await chatService.sendWithFailover(session, trimmedMessage);

    const text = response.text;
    if (!text) {
      return res.json({
        response: 'No puedo responder a eso. ¿Podemos intentar con otra pregunta?',
        sessionId: id,
      });
    }

    res.json({ response: text, sessionId: id });
  } catch (error) {
    console.error('Chat error:', error.status ?? error.name, error.message);
    const { status, code, error: msg } = chatService.toClientError(error);
    res.status(status).json({ code, error: msg });
  }
};

export const reset = (req, res) => {
  const { sessionId } = req.body ?? {};
  if (sessionId) chatService.deleteSession(sessionId);
  res.json({ success: true });
};
