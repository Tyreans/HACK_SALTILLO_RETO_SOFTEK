import { useMemo } from 'react';
import './RestockPopup.css';

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
  products = [],
  stores = [],
  selectedStore = '',
  onStoreChange,
  onClose,
  onCancel,
  onConfirm,
  onQuantityChange,
  onEdit,
  onAccept,
  onReject,
  onOpenAddManager,
  isLoading = false,
  busyId = null,
  error = '',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h1>{title}</h1>
              {onOpenAddManager && (
                <button
                  type="button"
                  onClick={onOpenAddManager}
                  style={{
                    padding: '0.35rem 0.75rem',
                    backgroundColor: '#fff7ed',
                    color: '#ea580c',
                    border: '1px solid #fed7aa',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  + Agregar opción
                </button>
              )}
            </div>
            <p>{subtitle}</p>
            <span>{description}</span>
            <label className="store-picker">
              Tienda
              <select value={selectedStore} onChange={(event) => onStoreChange?.(event.target.value)} disabled={!stores.length}>
                {stores.map((store) => (
                  <option key={store.store_id} value={store.store_id}>
                    {store.store_name} ({store.store_id})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button className="close-button" type="button" aria-label="Cerrar" onClick={onClose}>
            <IconClose />
          </button>
        </header>

        {error ? <p className="request-error" role="alert">{error}</p> : null}
        {isLoading ? <p className="request-message" role="status">Cargando recomendaciones…</p> : null}
        {!isLoading && !error && !products.length ? (
          <p className="request-message">No hay recomendaciones para esta tienda.</p>
        ) : null}
        <div className="product-list">
          {products.map((product) => {
            const resolved = product.action === 'accepted' || product.action === 'rejected';
            const busy = busyId === product.id;
            return (
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
                  disabled={resolved || busy}
                  aria-label={`Disminuir ${product.name}`}
                >
                  <IconMinus />
                </button>
                <strong>{product.quantity ?? 0}</strong>
                <button
                  type="button"
                  onClick={() => handleQuantity(product.id, 1)}
                  disabled={resolved || busy}
                  aria-label={`Aumentar ${product.name}`}
                >
                  <IconPlus />
                </button>
              </div>

              <div className="date-box">
                <span>Recomendación creada</span>
                <strong>{product.date}</strong>
              </div>

              <div className="action-group">
                <button
                  type="button"
                  className={`secondary-action ${product.action === 'editing' ? 'secondary-action-active' : ''}`}
                  onClick={() => onEdit?.(product.id)}
                  disabled={resolved || busy}
                >
                  <IconPencil />
                  {busy ? 'Guardando…' : 'Guardar'}
                </button>

                <button type="button" className="primary-action" onClick={() => onAccept?.(product.id)} disabled={resolved || busy}>
                  Aceptar
                </button>
                <button type="button" className="ghost-action" onClick={() => onReject?.(product.id)} disabled={resolved || busy}>
                  Rechazar
                </button>
              </div>
            </article>
            );
          })}
        </div>

        <footer className="modal-footer">
          <button type="button" className="cancel-button" onClick={onCancel ?? onClose}>
            Cancelar
          </button>
          <button type="button" className="confirm-button" onClick={() => onConfirm?.(products)} disabled={isLoading || !products.some((product) => product.action === 'idle' || product.action === 'editing')}>
            Confirmar reposición
            <span className="total-indicator">{totalToRestock}</span>
          </button>
        </footer>
      </section>
    </main>
  );
}
