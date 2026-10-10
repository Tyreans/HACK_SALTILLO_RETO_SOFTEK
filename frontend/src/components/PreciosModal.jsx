import { useState } from 'react';
import './PreciosModal.css';

const defaultPrecios = [
  {
    id: 301,
    name: 'Batido de plátano',
    statusBadge: 'Precio sugerido disponible',
    precioActual: 3.50,
    precioSugerido: 2.90,
    rangoValido: '$2.50 – $4.00',
    emoji: '🍌',
    motivo: '',
    deseado: 2.90,
  },
  {
    id: 302,
    name: 'Té de jazmín',
    statusBadge: 'Propuesta de ejemplo',
    precioActual: 3.20,
    precioSugerido: 2.80,
    rangoValido: '$2.60 – $3.60',
    emoji: '🍵',
    motivo: '',
    deseado: 2.80,
  },
  {
    id: 303,
    name: 'Pan de centeno',
    statusBadge: 'Propuesta de ejemplo',
    precioActual: 2.50,
    precioSugerido: 2.20,
    rangoValido: '$2.00 – $3.00',
    emoji: '🍞',
    motivo: '',
    deseado: 2.20,
  },
];

export default function PreciosModal({
  precios = defaultPrecios,
  onClose,
  onOpenAddManager,
  onSavePrice,
  onRejectPrice,
}) {
  const [items, setItems] = useState(precios);

  const handlePriceChange = (id, val) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, deseado: val } : it))
    );
  };

  const handleMotivoChange = (id, val) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, motivo: val } : it))
    );
  };

  const handleSave = (item) => {
    if (onSavePrice) {
      onSavePrice(item);
    }
  };

  const handleReject = (item) => {
    setItems((prev) => prev.filter((it) => it.id !== item.id));
    if (onRejectPrice) {
      onRejectPrice(item);
    }
  };

  return (
    <div className="precios-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="precios-modal-card" onClick={(e) => e.stopPropagation()}>
        <header className="precios-modal-header">
          <div className="precios-header-left">
            <div className="precios-header-row">
              <h2 className="precios-modal-title">Editar precios de recomendación</h2>
              <button
                type="button"
                className="precios-add-btn"
                onClick={onOpenAddManager}
                title="Proponer nuevo precio como gerente"
              >
                + Proponer precio
              </button>
            </div>
            <p className="precios-modal-sub">
              Comparación y búsqueda de mejores precios contra la competencia en el mercado.
            </p>
          </div>
          <button className="precios-modal-close" onClick={onClose} aria-label="Cerrar modal">
            ✕
          </button>
        </header>

        <div className="precios-modal-body">
          {items.map((item) => (
            <article key={item.id} className="precio-card">
              <div className="precio-visual">{item.emoji}</div>

              <div className="precio-content">
                <div className="precio-header-line">
                  <h3>{item.name}</h3>
                  <span className="precio-badge-sug">{item.statusBadge}</span>
                </div>

                <div className="precio-comparison-row">
                  <div className="precio-item-metric">
                    <span className="precio-dot-current" />
                    <span>Precio actual:</span>
                    <strong className="precio-val-current">${Number(item.precioActual).toFixed(2)}</strong>
                  </div>

                  <div className="precio-item-metric">
                    <span className="precio-dot-suggested" />
                    <span>Precio sugerido:</span>
                    <strong className="precio-val-suggested">${Number(item.precioSugerido).toFixed(2)}</strong>
                  </div>

                  <span className="precio-range-tag">Rango: {item.rangoValido}</span>
                </div>

                <div className="precio-inputs-row">
                  <div className="precio-input-field">
                    <label>Nuevo precio deseado</label>
                    <input
                      type="number"
                      step="0.05"
                      className="precio-text-input"
                      value={item.deseado ?? item.precioSugerido}
                      onChange={(e) => handlePriceChange(item.id, e.target.value)}
                    />
                  </div>

                  <div className="precio-input-field">
                    <label>Motivo del cambio (opcional)</label>
                    <input
                      type="text"
                      className="precio-text-input"
                      placeholder="Ej. Ajuste por competencia"
                      value={item.motivo || ''}
                      onChange={(e) => handleMotivoChange(item.id, e.target.value)}
                    />
                  </div>
                </div>

                <div className="precio-actions-row">
                  <button
                    type="button"
                    className="precio-btn-edit"
                    onClick={() => handlePriceChange(item.id, item.precioSugerido)}
                  >
                    Usar Sugerido
                  </button>
                  <button
                    type="button"
                    className="precio-btn-reject"
                    onClick={() => handleReject(item)}
                  >
                    Rechazar
                  </button>
                  <button
                    type="button"
                    className="precio-btn-save"
                    onClick={() => handleSave(item)}
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
