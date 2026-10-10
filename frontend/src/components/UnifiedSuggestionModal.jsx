import { useState, useEffect } from 'react';
import './UnifiedSuggestionModal.css';

// Las categorías que dependen de la base no tienen datos de demostración como fallback.
export const defaultModuleSuggestions = {
  reposicion: [],
  promocion: [],
  precio: [
    {
      id: 'prc-1',
      name: 'Batido de plátano',
      sku: 'SKU-BEV-03',
      statusBadge: 'Precio sugerido disponible',
      prioClass: 'precio',
      emoji: '🍌',
      razon_ia: 'Competencia en la misma manzana ofrece producto similar a $2.95. Ajustando a $2.90 ganamos cuota sin comprometer el margen.',
      precioActual: 3.50,
      precioSugerido: 2.90,
      rangoValido: '$2.50 – $4.00',
      precioDeseado: 2.90,
      motivo: 'Ajuste por competencia zonal',
    },
    {
      id: 'prc-2',
      name: 'Té de jazmín (Caja)',
      sku: 'SKU-TEA-04',
      statusBadge: 'Margen optimizable',
      prioClass: 'precio',
      emoji: '🍵',
      razon_ia: 'Ventas un 12% por debajo de la media regional. Reducción táctica reactiva demanda estancada.',
      precioActual: 3.20,
      precioSugerido: 2.80,
      rangoValido: '$2.60 – $3.60',
      precioDeseado: 2.80,
      motivo: 'Estimular rotación',
    },
    {
      id: 'prc-3',
      name: 'Pan de centeno (Pieza)',
      sku: 'SKU-BK-05',
      statusBadge: 'Alineación de mercado',
      prioClass: 'precio',
      emoji: '🍞',
      razon_ia: 'Margen actual es del 76%. Permite ajuste competitivo para acelerar salida antes de caducidad.',
      precioActual: 2.50,
      precioSugerido: 2.20,
      rangoValido: '$2.00 – $3.00',
      precioDeseado: 2.20,
      motivo: 'Alineación con panaderías locales',
    },
  ],
};

const moduleMeta = {
  reposicion: {
    title: '📦 Reposición de Inventario',
    subtitle: 'Identificación de productos con riesgo de quiebre de stock según proyección de ventas y tiempos de proveedor.',
    accentClass: 'reposicion',
    confirmLabel: 'Confirmar Reposición',
  },
  promocion: {
    title: '🏷️ Promociones y Ofertas Sugeridas',
    subtitle: 'Descuentos calculados con inventario, fecha de retiro, precio vigente y costo del producto.',
    accentClass: 'promocion',
    confirmLabel: 'Activar Promoción',
  },
  precio: {
    title: '💲 Ajuste y Comparativa de Precios',
    subtitle: 'Comparación y búsqueda de mejores precios contra la competencia en el mercado local.',
    accentClass: 'precio',
    confirmLabel: 'Guardar Precio',
  },
};

export default function UnifiedSuggestionModal({
  type = 'precio',
  items: initialItemsProp,
  isLoading = false,
  error = '',
  onClose,
  onApplyAction,
}) {
  const meta = moduleMeta[type] || moduleMeta.precio;
  const [items, setItems] = useState(() => initialItemsProp ?? defaultModuleSuggestions[type] ?? []);

  useEffect(() => {
    if (Array.isArray(initialItemsProp)) {
      setItems(initialItemsProp);
    }
  }, [initialItemsProp]);

  const handleFieldChange = (id, field, value) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleStepQuantity = (id, delta) => {
    setItems((prev) => prev.map((item) => {
      if (item.id !== id) return item;
      const quantity = item.cantidadDeseada ?? item.stockSugerido;
      if (quantity == null || !Number.isFinite(Number(quantity))) return item;
      return { ...item, cantidadDeseada: Math.max(1, Number(quantity) + delta) };
    }));
  };

  const canAccept = (item) => {
    if (type === 'reposicion') {
      const quantity = Number(item.cantidadDeseada ?? item.stockSugerido);
      return Number.isInteger(quantity) && quantity > 0;
    }
    if (type === 'promocion') {
      const discount = Number(item.descuentoDeseado ?? item.descuentoSugerido);
      return Number.isFinite(discount) && discount >= 1 && discount <= 90
        && Boolean(item.fechaInicio) && Boolean(item.fechaFin);
    }
    return true;
  };

  const handleAcceptItem = async (item) => {
    if (onApplyAction) {
      const ok = await onApplyAction(item, 'accept');
      if (ok) {
        setItems((prev) => prev.filter((it) => it.id !== item.id));
      }
    } else {
      setItems((prev) => prev.filter((it) => it.id !== item.id));
    }
  };

  const handleRejectItem = async (item) => {
    if (onApplyAction) {
      const ok = await onApplyAction(item, 'reject');
      if (ok) {
        setItems((prev) => prev.filter((it) => it.id !== item.id));
      }
    } else {
      setItems((prev) => prev.filter((it) => it.id !== item.id));
    }
  };

  return (
    <div className="mac-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="mac-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* HEADER CON TÍTULO DISTINTIVO */}
        <header className="mac-modal-header">
          <div className="mac-header-left">
            <div className="mac-title-row">
              <h2 className={`mac-modal-title ${meta.accentClass}`}>
                {meta.title}
              </h2>
            </div>
            <p className="mac-header-sub">{meta.subtitle}</p>
          </div>

          <div className="mac-header-actions">
            <button className="mac-btn-close" onClick={onClose} aria-label="Cerrar modal">
              ✕
            </button>
          </div>
        </header>

        {/* CUERPO DEL POPUP: LISTA DE PRODUCTOS ESTILO SUGERENCIAS_PRECIOS.PNG */}
        <div className="mac-modal-body">
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
              {error
                ? `No se pudieron cargar las recomendaciones: ${error}`
                : isLoading
                  ? 'Consultando recomendaciones actuales...'
                  : 'No hay recomendaciones pendientes para esta tienda.'}
            </div>
          ) : (
            items.map((item, index) => {
              const discount = Number(item.descuentoDeseado ?? item.descuentoSugerido);
              const promoPrice = item.precioRegular == null || !Number.isFinite(discount)
                ? null
                : Math.round(Number(item.precioRegular) * (1 - discount / 100) * 100) / 100;
              return (
              <article key={item.id} className="mac-item-card">
                {/* 1. Imagen / Emoji del producto */}
                <div className="mac-item-visual">{item.emoji}</div>

                {/* 2. Contenido Central */}
                <div className="mac-item-content">
                  {/* Nombre y Badge */}
                  <div className="mac-item-header-row">
                    <h3 className="mac-item-title">{index + 1}. {item.name}</h3>
                    <span className={`mac-item-badge ${item.prioClass || ''}`}>
                      {item.statusBadge}
                    </span>
                  </div>

                  {/* Razón de la IA (Gemini) */}
                  <div className="mac-ai-reason-box">
                    <span className="mac-ai-reason-label">🤖 Razón IA:</span>
                    <span>{item.razon_ia}</span>
                  </div>

                  {/* Comparativa de métricas según tipo */}
                  <div className="mac-metrics-compare-row">
                    {type === 'precio' && (
                      <>
                        <div className="mac-metric-point">
                          <span className="mac-dot-current" />
                          <span>Precio actual:</span>
                          <strong className="mac-val-current">${Number(item.precioActual).toFixed(2)}</strong>
                        </div>
                        <div className="mac-metric-point">
                          <span className="mac-dot-suggested" />
                          <span>Precio sugerido:</span>
                          <strong className="mac-val-suggested">${Number(item.precioSugerido).toFixed(2)}</strong>
                        </div>
                        <span className="mac-range-tag">Rango: {item.rangoValido}</span>
                      </>
                    )}

                    {type === 'reposicion' && (
                      <>
                        <div className="mac-metric-point">
                          <span className="mac-dot-current" />
                          <span>Stock actual:</span>
                          <strong className="mac-val-current">{item.stockActual ?? '—'} u.</strong>
                        </div>
                        <div className="mac-metric-point">
                          <span className="mac-dot-suggested" />
                          <span>Sugerido reposición:</span>
                          <strong className="mac-val-suggested">+{item.stockSugerido ?? '—'} u.</strong>
                        </div>
                      </>
                    )}

                    {type === 'promocion' && (
                      <>
                        <div className="mac-metric-point">
                          <span className="mac-dot-current" />
                          <span>Precio normal:</span>
                          <strong className="mac-val-current">{item.precioRegular == null ? '—' : `$${Number(item.precioRegular).toFixed(2)}`}</strong>
                        </div>
                        <div className="mac-metric-point">
                          <span className="mac-dot-suggested" />
                          <span>Precio con descuento:</span>
                          <strong className="mac-val-suggested">{promoPrice == null ? '—' : `$${promoPrice.toFixed(2)}`}</strong>
                        </div>
                        <span className="mac-range-tag">Sobrante proyectado: {item.stockObjetivo ?? '—'} u.</span>
                        <span className="mac-range-tag">Vigencia: {item.fechaInicio || 'hoy'} – {item.fechaFin || 'por definir'}</span>
                      </>
                    )}
                  </div>

                  {/* Fila de Inputs dinámicos */}
                  <div className="mac-inputs-row">
                    {type === 'precio' && (
                      <>
                        <div className="mac-input-col">
                          <label>Nuevo precio deseado ($ MXN)</label>
                          <input
                            type="number"
                            step="0.05"
                            className="mac-text-input"
                            value={item.precioDeseado ?? item.precioSugerido}
                            onChange={(e) => handleFieldChange(item.id, 'precioDeseado', e.target.value)}
                          />
                        </div>
                        <div className="mac-input-col">
                          <label>Motivo del cambio (opcional)</label>
                          <input
                            type="text"
                            className="mac-text-input"
                            placeholder="Ej. Ajuste por competencia"
                            value={item.motivo || ''}
                            onChange={(e) => handleFieldChange(item.id, 'motivo', e.target.value)}
                          />
                        </div>
                      </>
                    )}

                    {type === 'reposicion' && (
                      <>
                        <div className="mac-input-col">
                          <label>Cantidad a pedir</label>
                          <div className="mac-stepper-wrap">
                            <button
                              type="button"
                              className="mac-stepper-btn"
                              onClick={() => handleStepQuantity(item.id, -1)}
                              disabled={(item.cantidadDeseada ?? item.stockSugerido) == null
                                || !Number.isFinite(Number(item.cantidadDeseada ?? item.stockSugerido))}
                            >
                              −
                            </button>
                            <span className="mac-stepper-val">
                              {(item.cantidadDeseada ?? item.stockSugerido) == null ? '—' : item.cantidadDeseada ?? item.stockSugerido}
                            </span>
                            <button
                              type="button"
                              className="mac-stepper-btn"
                              onClick={() => handleStepQuantity(item.id, 1)}
                              disabled={(item.cantidadDeseada ?? item.stockSugerido) == null
                                || !Number.isFinite(Number(item.cantidadDeseada ?? item.stockSugerido))}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </>
                    )}

                    {type === 'promocion' && (
                      <>
                        <div className="mac-input-col">
                          <label>Porcentaje de descuento deseado (%)</label>
                          <input
                            type="number"
                            min="1"
                            max="90"
                            className="mac-text-input"
                            value={item.descuentoDeseado ?? item.descuentoSugerido ?? ''}
                            onChange={(e) => handleFieldChange(item.id, 'descuentoDeseado', e.target.value)}
                          />
                        </div>
                        <div className="mac-input-col">
                          <label>Inicio</label>
                          <input
                            type="date"
                            className="mac-text-input"
                            value={item.fechaInicio || ''}
                            onChange={(e) => handleFieldChange(item.id, 'fechaInicio', e.target.value)}
                          />
                        </div>
                        <div className="mac-input-col">
                          <label>Fin</label>
                          <input
                            type="date"
                            className="mac-text-input"
                            value={item.fechaFin || ''}
                            onChange={(e) => handleFieldChange(item.id, 'fechaFin', e.target.value)}
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="mac-actions-row">
                    <button
                      type="button"
                      className="mac-btn-subtle"
                      onClick={() => {
                        if (type === 'precio') handleFieldChange(item.id, 'precioDeseado', item.precioSugerido);
                        if (type === 'reposicion') handleFieldChange(item.id, 'cantidadDeseada', item.stockSugerido);
                        if (type === 'promocion') handleFieldChange(item.id, 'descuentoDeseado', item.descuentoSugerido);
                      }}
                    >
                      Usar Sugerido
                    </button>
                    <button
                      type="button"
                      className="mac-btn-reject"
                      onClick={() => handleRejectItem(item)}
                    >
                      Rechazar
                    </button>
                    <button
                      type="button"
                      className="mac-btn-primary"
                      onClick={() => handleAcceptItem(item)}
                      disabled={!canAccept(item)}
                    >
                      {meta.confirmLabel}
                    </button>
                  </div>
                </div>
              </article>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
