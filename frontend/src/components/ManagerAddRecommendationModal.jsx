import { useState } from 'react';
import './ManagerAddRecommendationModal.css';

const availableProducts = [
  { sku: 'SKU-COF-01', name: 'Café espresso (Grano 1kg)', precioActual: 18.00 },
  { sku: 'SKU-BK-02', name: 'Aguacates (KG)', precioActual: 4.50 },
  { sku: 'SKU-TEA-04', name: 'Té de jazmín (Caja)', precioActual: 3.20 },
  { sku: 'SKU-BK-05', name: 'Pan de centeno (Pieza)', precioActual: 2.50 },
  { sku: 'SKU-BEV-06', name: 'Chía con leche (Envase)', precioActual: 3.50 },
  { sku: 'SKU-BEV-03', name: 'Batido de plátano (500ml)', precioActual: 3.50 },
  { sku: 'SKU-SND-07', name: 'Tostada de aguacate', precioActual: 4.20 },
];

export default function ManagerAddRecommendationModal({
  storeId = 'S001',
  initialType = 'reposicion',
  onClose,
  onSubmit,
}) {
  const [tipo, setTipo] = useState(initialType);
  const [sku, setSku] = useState(availableProducts[0].sku);
  const [cantidad, setCantidad] = useState(25);
  const [descuentoPct, setDescuentoPct] = useState(15);
  const [precio, setPrecio] = useState(availableProducts[0].precioActual);
  const [motivo, setMotivo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleProductChange = (e) => {
    const selectedSku = e.target.value;
    setSku(selectedSku);
    const prod = availableProducts.find((p) => p.sku === selectedSku);
    if (prod && tipo === 'precio') {
      setPrecio(Number((prod.precioActual * 0.95).toFixed(2)));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const prod = availableProducts.find((p) => p.sku === sku);

    const payload = {
      tienda: storeId,
      tipo,
      sku,
      producto: prod?.name || sku,
      motivo: motivo.trim() || `Propuesta manual creada por el gerente`,
    };

    if (tipo === 'reposicion') {
      payload.cantidad = Number(cantidad);
    } else if (tipo === 'promocion') {
      payload.descuento_pct = Number(descuentoPct);
    } else if (tipo === 'precio') {
      payload.precio = Number(precio);
    }

    try {
      await onSubmit(payload);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mgr-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="mgr-modal-card" onClick={(e) => e.stopPropagation()}>
        <header className="mgr-modal-header">
          <div className="mgr-modal-header-copy">
            <h2>Nueva Sugerencia de Gerente</h2>
            <p>Sucursal {storeId} · Agregar ajuste o acción operativa</p>
          </div>
          <button className="mgr-modal-close-btn" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="mgr-modal-body">
            {/* Selector de Tipo */}
            <div className="mgr-form-group">
              <label className="mgr-form-label">Tipo de Acción</label>
              <div className="mgr-type-selector">
                <button
                  type="button"
                  className={`mgr-type-btn ${tipo === 'reposicion' ? 'active' : ''}`}
                  onClick={() => setTipo('reposicion')}
                >
                  <span>📦</span>
                  <span>Re-Stock</span>
                </button>
                <button
                  type="button"
                  className={`mgr-type-btn ${tipo === 'promocion' ? 'active' : ''}`}
                  onClick={() => setTipo('promocion')}
                >
                  <span>🏷️</span>
                  <span>Promoción</span>
                </button>
                <button
                  type="button"
                  className={`mgr-type-btn ${tipo === 'precio' ? 'active' : ''}`}
                  onClick={() => setTipo('precio')}
                >
                  <span>💲</span>
                  <span>Precio</span>
                </button>
              </div>
            </div>

            {/* Selector de Producto */}
            <div className="mgr-form-group">
              <label className="mgr-form-label">Producto Afectado</label>
              <select className="mgr-form-select" value={sku} onChange={handleProductChange} required>
                {availableProducts.map((p) => (
                  <option key={p.sku} value={p.sku}>
                    {p.name} (${p.precioActual.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            {/* Campo dinámico según tipo */}
            {tipo === 'reposicion' && (
              <div className="mgr-form-group">
                <label className="mgr-form-label">
                  <span>Cantidad a reabastecer</span>
                  <small>Unidades (1 - 10,000)</small>
                </label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  className="mgr-form-input"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  required
                />
              </div>
            )}

            {tipo === 'promocion' && (
              <div className="mgr-form-group">
                <label className="mgr-form-label">
                  <span>Porcentaje de Descuento</span>
                  <small>% (1% a 90%)</small>
                </label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  className="mgr-form-input"
                  value={descuentoPct}
                  onChange={(e) => setDescuentoPct(e.target.value)}
                  required
                />
              </div>
            )}

            {tipo === 'precio' && (
              <div className="mgr-form-group">
                <label className="mgr-form-label">
                  <span>Nuevo Precio Propuesto</span>
                  <small>MXN</small>
                </label>
                <input
                  type="number"
                  step="0.10"
                  min="0.10"
                  max="9999"
                  className="mgr-form-input"
                  value={precio}
                  onChange={(e) => setPrecio(e.target.value)}
                  required
                />
              </div>
            )}

            {/* Motivo opcional */}
            <div className="mgr-form-group">
              <label className="mgr-form-label">
                <span>Justificación o Motivo</span>
                <small>Máx 200 caracteres</small>
              </label>
              <textarea
                className="mgr-form-textarea"
                maxLength={200}
                placeholder="Ej. Alta demanda proyectada por evento local..."
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              />
            </div>
          </div>

          <footer className="mgr-modal-footer">
            <button type="button" className="mgr-btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="mgr-btn-submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar y Publicar'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
