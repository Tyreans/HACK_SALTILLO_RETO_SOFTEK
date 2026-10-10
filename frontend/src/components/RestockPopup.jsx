import { useMemo } from 'react';
import './RestockPopup.css';

const defaultProducts = [
  {
    id: 'cafe',
    name: 'Café espresso',
    category: 'Grano · Bolsa 1kg',
    status: 'Bajo stock',
    stock: 'Stock actual: 12 unidades | Stock objetivo: 50 uds',
    date: '14 oct 2026',
    tone: 'coffee',
    emoji: '☕',
    quantity: 38,
    action: 'idle',
  },
  {
    id: 'aguacate',
    name: 'Aguacates (KG)',
    category: 'Materia prima',
    status: 'Bajo stock',
    stock: 'Stock actual: 8 kg | Stock objetivo: 25 kg',
    date: '17 oct 2026',
    tone: 'avocado',
    emoji: '🥑',
    quantity: 17,
    action: 'idle',
  },
  {
    id: 'platano',
    name: 'Batido de plátano',
    category: 'Ingredientes',
    status: 'Bajo stock',
    stock: 'Stock actual: 5 kg | Stock objetivo: 15 kg',
    date: '21 oct 2026',
    tone: 'banana',
    emoji: '🍌',
    quantity: 10,
    action: 'idle',
  },
];

function IconClose() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6 6L18 18M18 6L6 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconPencil() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 16.5V20h3.5L17.8 9.7l-3.5-3.5L4 16.5Zm12.7-9.8 2.3-2.3a1.2 1.2 0 0 1 1.7 0l1.8 1.8a1.2 1.2 0 0 1 0 1.7l-2.3 2.3-3.5-3.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconMinus() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export default function RestockPopup({
  products = defaultProducts,
  onClose,
  onCancel,
  onConfirm,
  onQuantityChange,
  onEdit,
  onAccept,
  onReject,
  title = 'Reposición de Inventario',
  subtitle = 'Confirmar orden de reposición',
  description = 'Se han identificado productos con stock bajo. Confirma o edita las cantidades a añadir para alcanzar el stock objetivo.',
}) {
  const totalToRestock = useMemo(
    () => products.reduce((sum, product) => sum + (product.quantity ?? 0), 0),
    [products]
  );

  const handleQuantity = (id, delta) => {
    if (typeof onQuantityChange === 'function') {
      onQuantityChange(id, delta);
    }
  };

  return (
    <main className="page-shell">
      <section className="restock-modal" aria-label="Popup de reposición de inventario">
        <header className="modal-header">
          <div className="header-copy">
            <h1>{title}</h1>
            <p>{subtitle}</p>
            <span>{description}</span>
          </div>

          <button className="close-button" type="button" aria-label="Cerrar" onClick={onClose}>
            <IconClose />
          </button>
        </header>

        <div className="product-list">
          {products.map((product) => (
            <article key={product.id} className="restock-row">
              <div className={`product-visual ${product.tone}`} aria-hidden="true">
                <span>{product.emoji}</span>
              </div>

              <div className="product-info">
                <div className="product-title-wrap">
                  <h2>{product.name}</h2>
                  <span
                    className={`badge ${product.action === 'accepted' ? 'badge-success' : ''} ${product.action === 'rejected' ? 'badge-danger' : ''}`}
                  >
                    {product.action === 'accepted'
                      ? 'Aceptado'
                      : product.action === 'rejected'
                        ? 'Rechazado'
                        : product.status}
                  </span>
                </div>

                <div className="product-subtitle">{product.category}</div>
                <div className="product-stock">{product.stock}</div>
              </div>

              <div className="quantity-box" aria-label={`Cantidad para ${product.name}`}>
                <button
                  type="button"
                  onClick={() => handleQuantity(product.id, -1)}
                  aria-label={`Disminuir ${product.name}`}
                >
                  <IconMinus />
                </button>
                <strong>{product.quantity ?? 0}</strong>
                <button
                  type="button"
                  onClick={() => handleQuantity(product.id, 1)}
                  aria-label={`Aumentar ${product.name}`}
                >
                  <IconPlus />
                </button>
              </div>

              <div className="date-box">
                <span>Restock programado</span>
                <strong>{product.date}</strong>
              </div>

              <div className="action-group">
                <button
                  type="button"
                  className={`secondary-action ${product.action === 'editing' ? 'secondary-action-active' : ''}`}
                  onClick={() => onEdit?.(product.id)}
                >
                  <IconPencil />
                  Editar
                </button>

                <button type="button" className="primary-action" onClick={() => onAccept?.(product.id)}>
                  Aceptar
                </button>
                <button type="button" className="ghost-action" onClick={() => onReject?.(product.id)}>
                  Rechazar
                </button>
              </div>
            </article>
          ))}
        </div>

        <footer className="modal-footer">
          <button type="button" className="cancel-button" onClick={onCancel ?? onClose}>
            Cancelar
          </button>
          <button type="button" className="confirm-button" onClick={() => onConfirm?.(products)}>
            Confirmar reposición
            <span className="total-indicator">{totalToRestock}</span>
          </button>
        </footer>
      </section>
    </main>
  );
}
