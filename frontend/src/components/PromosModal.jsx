import { useState } from 'react';
import './PromosModal.css';

const defaultPromos = [
  {
    id: 201,
    name: 'Combo Mañana',
    discount: '20% de descuento',
    discountNum: 20,
    description: 'Atrae a tus clientes matutinos con este paquete exclusivo. Válido de 7am a 11am.',
    items: ['Té de jazmín', 'Pan de centeno'],
    emoji: '🥐',
    status: 'idle',
  },
  {
    id: 202,
    name: 'Café Espresso',
    discount: '30% de descuento',
    discountNum: 30,
    description: 'Ofrece a tus clientes el aroma y sabor intenso del espresso premium.',
    items: ['Café espresso'],
    emoji: '☕',
    status: 'idle',
  },
  {
    id: 203,
    name: 'Batido de Plátano',
    discount: '15% de descuento',
    discountNum: 15,
    description: 'Refresca a tus clientes con este batido natural lleno de energía.',
    items: ['Batido de plátano'],
    emoji: '🍌',
    status: 'idle',
  },
];

export default function PromosModal({
  promotions = defaultPromos,
  onClose,
  onOpenAddManager,
  onActivate,
  onReject,
  onEdit,
}) {
  const [promosList, setPromosList] = useState(promotions);

  const handleActivatePromo = (promo) => {
    setPromosList((prev) =>
      prev.map((p) => (p.id === promo.id ? { ...p, status: 'activated' } : p))
    );
    if (onActivate) onActivate(promo);
  };

  const handleRejectPromo = (promo) => {
    setPromosList((prev) =>
      prev.map((p) => (p.id === promo.id ? { ...p, status: 'rejected' } : p))
    );
    if (onReject) onReject(promo);
  };

  return (
    <div className="promo-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="promo-modal-card" onClick={(e) => e.stopPropagation()}>
        <header className="promo-modal-header">
          <div className="promo-header-left">
            <h2 className="promo-modal-title">Nueva Promoción</h2>
            <button
              type="button"
              className="promo-add-btn"
              onClick={onOpenAddManager}
              title="Agregar nueva opción como gerente"
            >
              + Crear promoción
            </button>
          </div>
          <button className="promo-modal-close" onClick={onClose} aria-label="Cerrar modal">
            ✕
          </button>
        </header>

        <div className="promo-modal-body">
          {promosList.map((promo) => (
            <article key={promo.id} className="promo-card">
              <div className="promo-card-top">
                <span className="promo-badge">{promo.discount}</span>
                <button
                  type="button"
                  className="promo-edit-btn"
                  onClick={() => onEdit ? onEdit(promo) : alert(`Editar promoción: ${promo.name}`)}
                >
                  Editar
                </button>
              </div>

              <div className="promo-content">
                <div className="promo-visual">{promo.emoji}</div>
                <div className="promo-details">
                  <h3>{promo.name}</h3>
                  <p>{promo.description}</p>
                  <div className="promo-items-list">
                    {promo.items.map((item, idx) => (
                      <span key={idx} className="promo-item-pill">
                        ✓ {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="promo-actions">
                <button
                  type="button"
                  className="promo-btn-activate"
                  disabled={promo.status === 'activated'}
                  onClick={() => handleActivatePromo(promo)}
                >
                  {promo.status === 'activated' ? '✓ Promoción Activa' : 'Activar'}
                </button>
                <button
                  type="button"
                  className="promo-btn-reject"
                  disabled={promo.status === 'rejected'}
                  onClick={() => handleRejectPromo(promo)}
                >
                  {promo.status === 'rejected' ? 'Rechazada' : 'Rechazar oferta'}
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
