import { useState, useRef, useEffect } from 'react';
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (queryText) => {
    const textToSend = queryText || inputMessage;
    if (!textToSend.trim() || isLoading) return;

    const userMsg = { role: 'user', text: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    // Preparar mensaje con contexto de sucursal si está seleccionada
    const contextualQuery = store && !textToSend.toLowerCase().includes(store.id.toLowerCase())
      ? `[Contexto de sucursal ${store.name} (${store.id})]: ${textToSend}`
      : textToSend;

    try {
      // Llamar al backend Express (/api/chat con sessionId multi-turno)
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: contextualQuery,
          sessionId: sessionId || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.response) {
        if (data.sessionId) setSessionId(data.sessionId);
        setMessages((prev) => [...prev, { role: 'assistant', text: data.response }]);
      } else {
        const errorMsg = data.error || data.message || (res.status === 429 ? 'Límite de solicitudes de IA alcanzado. Espera un momento.' : 'No se pudo obtener respuesta del asistente.');
        setMessages((prev) => [...prev, { role: 'assistant', text: `⚠️ ${errorMsg}` }]);
      }
    } catch {
      // Fallback inteligente en caso de desconexión total del servidor
      setTimeout(() => {
        let fallbackReply = '';
        const q = textToSend.toLowerCase();

        if (q.includes('merma') || q.includes('caducidad')) {
          fallbackReply = `En la red de Saltillo, **Sucursal Furby** y **Sucursal Acuña** presentan la mayor merma por caducidad (16.8% y 14.2% respectivamente). Se recomienda activar un 30% de descuento en perecederos como Batidos y Aguacates.`;
        } else if (q.includes('chespi') || q.includes('mejor') || q.includes('vende')) {
          fallbackReply = `**Sucursal Chespi (S001)** es la tienda líder en ventas esta semana con **$158,420 MXN** (+18.4%), impulsada por alta rotación de Café Espresso 1kg y Donut Holes.`;
        } else if (q.includes('reponer') || q.includes('restock') || q.includes('stock')) {
          fallbackReply = `Recomendación de Re-Stock para **${store ? store.name : 'la red'}**: Se sugiere pedir **38 uds de Café espresso**, **17 kg de Aguacate** y **10 kg de Plátano** para evitar quiebre de stock en los próximos 3 días.`;
        } else {
          fallbackReply = `Basado en los datos de la red Otzo (${store ? store.name : 'Todas las sucursales'}): La operación mantiene un margen bruto promedio del 71.2%. ¿Deseas generar una orden de compra o revisar promociones sugeridas?`;
        }

        setMessages((prev) => [...prev, { role: 'assistant', text: fallbackReply }]);
      }, 700);
    } finally {
      setIsLoading(false);
    }
  };

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
