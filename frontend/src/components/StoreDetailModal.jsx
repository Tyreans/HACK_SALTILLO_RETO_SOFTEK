import './StoreDetailModal.css';

export default function StoreDetailModal({
  store,
  onClose,
  onOpenRestock,
  onAskGemini,
}) {
  if (!store) return null;

  const isHappy = store.avatar === 'happy';
  const isWorried = store.avatar === 'worried';

  return (
    <div className="store-modal-backdrop" onClick={onClose}>
      <div className="store-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Cabecera del modal */}
        <div className="store-modal-header">
          <div className="store-modal-title-block">
            <div className="store-badge-format">{store.format} · {store.hours}</div>
            <h2 className="store-modal-title">{store.name}</h2>
            <p className="store-modal-address">📍 {store.address} · {store.city}</p>
          </div>
          <button className="store-modal-close-btn" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        {/* Sección central: Avatar Reactivo + Estado de Rendimiento */}
        <div className={`store-avatar-banner ${isHappy ? 'banner-happy' : isWorried ? 'banner-worried' : 'banner-neutral'}`}>
          <div className="store-avatar-graphic">
            {isHappy ? (
              <span className="avatar-emoji-large" role="img" aria-label="Feliz">🎉🐱</span>
            ) : isWorried ? (
              <span className="avatar-emoji-large" role="img" aria-label="Alerta">⚠️😿</span>
            ) : (
              <span className="avatar-emoji-large" role="img" aria-label="Estable">✨😺</span>
            )}
          </div>
          <div className="store-avatar-info">
            <div className="store-avatar-status-title">
              {isHappy && '¡Excelente Rendimiento Operativo!'}
              {isWorried && 'Atención Requerida: Merma y Baja Rotación'}
              {!isHappy && !isWorried && 'Operación Estable y en Meta'}
            </div>
            <p className="store-avatar-status-desc">
              {isHappy && `Crecimiento de ventas del +${store.variationPct}% vs semana anterior con merma mínima (${store.mermaPct}%).`}
              {isWorried && `Ventas cayeron ${store.variationPct}% con merma por caducidad elevada (${store.mermaPct}%). El agente recomienda promociones.`}
              {!isHappy && !isWorried && `Cumplimiento de presupuesto dentro de parámetros normales. Rotación adecuada de inventario.`}
            </p>
          </div>
        </div>

        {/* 4 Paneles / Tarjetas de Métricas */}
        <div className="store-metrics-grid">
          <div className="metric-card">
            <span className="metric-card-label">Ventas Totales</span>
            <span className="metric-card-value">{store.salesFormatted}</span>
            <span className={`metric-card-tag ${store.variationPct >= 0 ? 'tag-green' : 'tag-red'}`}>
              {store.variationPct >= 0 ? `+${store.variationPct}%` : `${store.variationPct}%`} vs prev
            </span>
          </div>

          <div className="metric-card">
            <span className="metric-card-label">Tickets / Clientes</span>
            <span className="metric-card-value">{store.tickets}</span>
            <span className="metric-card-sub">Tráfico diario activo</span>
          </div>

          <div className="metric-card">
            <span className="metric-card-label">Margen Bruto</span>
            <span className="metric-card-value">{store.marginPct}%</span>
            <span className="metric-card-sub">Meta cadena: 70%</span>
          </div>

          <div className="metric-card">
            <span className="metric-card-label">Merma por Caducidad</span>
            <span className="metric-card-value" style={{ color: store.mermaPct > 10 ? '#dc2626' : '#059669' }}>
              {store.mermaPct}%
            </span>
            <span className="metric-card-sub">{store.mermaPct > 10 ? 'Alta merma' : 'Controlada'}</span>
          </div>
        </div>

        {/* Paneles de Top y Bottom Productos (resumen breve) */}
        <div className="store-products-breakdown">
          <div className="products-column-card">
            <div className="products-column-header text-green">
              <span>▲ Más Vendidos (Top Rotación)</span>
            </div>
            <ul className="products-mini-list">
              <li>
                <span>☕ Café Espresso 1kg</span>
                <b>84 uds · $1,918</b>
              </li>
              <li>
                <span>🍩 50 Donut Holes</span>
                <b>62 uds · $1,420</b>
              </li>
              <li>
                <span>🥪 Flatbread Jamón</span>
                <b>45 uds · $980</b>
              </li>
            </ul>
          </div>

          <div className="products-column-card">
            <div className="products-column-header text-red">
              <span>▼ Menos Vendidos (Alerta Merma)</span>
            </div>
            <ul className="products-mini-list">
              <li>
                <span>🍌 Batido de Plátano</span>
                <b>8 uds · $120</b>
              </li>
              <li>
                <span>🥑 Aguacates Frescos</span>
                <b>5 kg · $95</b>
              </li>
              <li>
                <span>🥗 Ensalada César</span>
                <b>3 uds · $85</b>
              </li>
            </ul>
          </div>
        </div>

        {/* Barra de botones de acción */}
        <div className="store-modal-actions-bar">
          <button
            className="btn-action-primary"
            onClick={() => {
              onClose();
              onOpenRestock(store);
            }}
          >
            🛒 Pedir Re-Stock (IA)
          </button>

          <button
            className="btn-action-secondary"
            onClick={() => {
              onClose();
              onAskGemini(`¿Qué productos sugieres reponer y qué promociones aplicar en ${store.name}?`);
            }}
          >
            🤖 Analizar con Gemini
          </button>
        </div>
      </div>
    </div>
  );
}
