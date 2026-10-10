import { useState, useRef, useEffect, useCallback } from 'react';
import { sendAssistantMessage } from '../services/assistantApi';
import './ChatDrawer.css';

export default function ChatDrawer({ initialQuery, store, onClose, onNavigateToStore }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: initialQuery
        ? `Hola, estoy analizando tu consulta: "${initialQuery}". ¿En qué más puedo apoyarte?`
        : '¡Hola! Soy Otzo, tu Asistente de Operaciones con IA. Pregúntame sobre ventas, inventario, mermas o recomendaciones de la red de sucursales.',
    },
  ]);
  const [sessionId, setSessionId] = useState(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const sentInitialQueryRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = useCallback(async (queryText) => {
    const textToSend = queryText || inputMessage;
    if (!textToSend.trim() || isLoading) return;

    const userMsg = { role: 'user', text: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    const contextualQuery = store
      ? `[Contexto de sucursal seleccionada: ${store.name} (${store.id})]. ${textToSend}`
      : textToSend;

    try {
      const data = await sendAssistantMessage(contextualQuery, sessionId);
      if (data.sessionId) setSessionId(data.sessionId);
      setMessages((prev) => [...prev, { role: 'assistant', text: data.response }]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'assistant', text: `⚠️ ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  }, [inputMessage, isLoading, sessionId, store]);

  useEffect(() => {
    const query = initialQuery?.trim();
    if (!query || sentInitialQueryRef.current === query) return;
    sentInitialQueryRef.current = query;
    handleSend(query);
  }, [initialQuery, handleSend]);

  const quickPrompts = [
    '¿Qué tienda tiene mayor merma?',
    '¿Cómo va Sucursal Chespi?',
    'Sugerir re-stock prioritario',
  ];

  return (
    <div className="chat-drawer-backdrop" onClick={onClose}>
      <div className="chat-drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Cabecera */}
        <div className="chat-drawer-header">
          <div className="chat-brand-header">
            <img src="/images/LOGO.png" alt="Otzo IA" className="chat-cat-avatar" />
            <div>
              <h3 className="chat-drawer-title">Otzo Asistente IA</h3>
              <p className="chat-drawer-sub">
                {store ? `Contexto: ${store.name}` : 'Conectado a la Base de Datos'}
              </p>
            </div>
          </div>
          <button className="chat-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Mensajes */}
        <div className="chat-messages-scroll">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`chat-bubble-row ${m.role === 'user' ? 'bubble-user' : 'bubble-assistant'}`}
            >
              {m.role === 'assistant' && (
                <div className="assistant-mini-badge">🐱</div>
              )}
              <div className="chat-bubble-content">
                {m.text}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="chat-bubble-row bubble-assistant">
              <div className="assistant-mini-badge">🐱</div>
              <div className="chat-bubble-content loading-typing">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Sugerencias Rápidas y Atajos a Sucursales */}
        <div className="quick-prompts-row">
          {onNavigateToStore && (
            <button
              type="button"
              className="quick-prompt-chip"
              style={{ backgroundColor: '#fff7ed', color: '#ea580c', borderColor: '#fed7aa', fontWeight: 'bold' }}
              onClick={() => onNavigateToStore('S001')}
            >
              🏪 Ir a Sucursal Chespi (S001)
            </button>
          )}
          {quickPrompts.map((p, i) => (
            <button
              key={i}
              className="quick-prompt-chip"
              onClick={() => handleSend(p)}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input */}
        <form
          className="chat-input-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <input
            type="text"
            className="chat-text-input"
            placeholder="Pregunta sobre ventas, mermas o inventario..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
          />
          <button type="submit" className="chat-send-btn" disabled={!inputMessage.trim()}>
            ➤
          </button>
        </form>
      </div>
    </div>
  );
}
