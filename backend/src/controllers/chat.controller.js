import * as chatService from '../services/chat.service.js';
import { captureQueryTrace } from '../config/db.config.js';
import { env } from '../config/env.config.js';

export const chat = async (req, res) => {
  let trimmedMessage = '';
  let trace = null;
  try {
    const { message, sessionId } = req.body ?? {};

    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ code: 'EMPTY', error: 'Escribe un mensaje.' });
    }
    if (message.length > 4000) {
      return res.status(400).json({ code: 'TOO_LONG', error: 'El mensaje es demasiado largo (máx. 4000 caracteres).' });
    }

    trimmedMessage = message.trim();
    const { id, session } = chatService.getOrCreateSession(sessionId);

    let response;
    let queries = [];
    if (env.nodeEnv === 'development') {
      trace = { question: trimmedMessage, models: [], toolCalls: [] };
      ({ result: response, queries } = await captureQueryTrace(
        () => chatService.sendWithFailover(session, trimmedMessage, trace)
      ));
    } else {
      response = await chatService.sendWithFailover(session, trimmedMessage);
    }

    const debug = trace ? { debug: { ...trace, queries } } : {};

    const text = response.text;
    if (!text) {
      return res.json({
        response: 'No puedo responder a eso. ¿Podemos intentar con otra pregunta?',
        sessionId: id,
        ...debug,
      });
    }

    res.json({ response: text, sessionId: id, ...debug });
  } catch (error) {
    console.error('Chat error:', error.status ?? error.name, error.message);
    const { status, code, error: msg } = chatService.toClientError(error);
    const debug = trace && env.nodeEnv === 'development'
      ? { debug: { ...trace, queries: error.queryTrace ?? [] } }
      : {};
    res.status(status).json({ code, error: msg, ...debug });
  }
};

export const reset = (req, res) => {
  const { sessionId } = req.body ?? {};
  if (sessionId) chatService.deleteSession(sessionId);
  res.json({ success: true });
};
