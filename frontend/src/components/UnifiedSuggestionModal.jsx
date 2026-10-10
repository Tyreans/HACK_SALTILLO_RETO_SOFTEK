import { useState, useEffect } from 'react';
import './UnifiedSuggestionModal.css';

// Datos predeterminados con Razón de la IA para cada categoría
export const defaultModuleSuggestions = {
  reposicion: [
    {
      id: 'rep-1',
      name: 'Café espresso (Grano 1kg)',
      sku: 'SKU-COF-01',
      statusBadge: 'Bajo stock',
      prioClass: 'alta',
      emoji: '☕',
      razon_ia: 'Se proyecta aumento de 35% en flujo de clientes matutinos este fin de semana. El inventario actual no resistirá el sábado.',
      stockActual: 12,
      stockSugerido: 38,
      stockObjetivo: 50,
      fechaProgramada: '14 oct 2026',
      cantidadDeseada: 38,
      motivo: 'Demanda de fin de semana',
    },
    {
      id: 'rep-2',
      name: 'Aguacates (KG)',
      sku: 'SKU-BK-02',
      statusBadge: 'Stock crítico',
      prioClass: 'alta',
      emoji: '🥑',
      razon_ia: 'Existencias en 8 kg frente a consumo semanal de 25 kg. Proveedor requiere 48 horas de tiempo de entrega estándar.',
      stockActual: 8,
      stockSugerido: 17,
      stockObjetivo: 25,
      fechaProgramada: '17 oct 2026',
      cantidadDeseada: 17,
      motivo: 'Tiempo de entrega proveedor',
    },
    {
      id: 'rep-3',
      name: 'Batido de plátano (Ingredientes)',
      sku: 'SKU-BEV-03',
      statusBadge: 'Bajo stock',
      prioClass: 'alta',
      emoji: '🍌',
      razon_ia: 'Ingredientes para batidos registran rotación acelerada. Se agotará en las próximas 36 horas.',
      stockActual: 5,
      stockSugerido: 10,
      stockObjetivo: 15,
      fechaProgramada: '21 oct 2026',
      cantidadDeseada: 10,
      motivo: 'Reposición preventiva',
    },
  ],
  promocion: [
    {
      id: 'promo-1',
      name: 'Combo Mañana (Té de jazmín + Pan de centeno)',
      sku: 'SKU-TEA-04',
      statusBadge: '20% OFF Sugerido',
      prioClass: 'promo',
      emoji: '🥐',
      razon_ia: 'El Pan de centeno tiene vida útil de 3 días y el Té de jazmín tiene rotación lenta. El combo incrementa la conversión en 18%.',
      precioRegular: 5.70,
      precioPromo: 4.50,
      descuentoSugerido: 20,
      descuentoDeseado: 20,
      horario: '7:00 am – 11:00 am',
      motivo: 'Evitar merma matutina',
    },
    {
      id: 'promo-2',
      name: 'Café Espresso Premium 1kg',
      sku: 'SKU-COF-01',
      statusBadge: '30% OFF Sugerido',
      prioClass: 'promo',
      emoji: '☕',
      razon_ia: 'Estimula la compra recurrente de oficinas corporativas cercanas en horario pico de 8:00 am a 10:00 am.',
      precioRegular: 18.00,
      precioPromo: 12.60,
      descuentoSugerido: 30,
      descuentoDeseado: 30,
      horario: 'Todo el día',
      motivo: 'Fidelización corporativa',
    },
    {
      id: 'promo-3',
      name: 'Batido de Plátano Energético',
      sku: 'SKU-BEV-03',
      statusBadge: '15% OFF Sugerido',
      prioClass: 'promo',
      emoji: '🍌',
      razon_ia: 'Captura compras por impulso de estudiantes y trabajadores jóvenes al inicio de la jornada.',
      precioRegular: 3.50,
      precioPromo: 2.95,
      descuentoSugerido: 15,
      descuentoDeseado: 15,
      horario: '12:00 pm – 4:00 pm',
      motivo: 'Impulso vespertino',
    },
  ],
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
    subtitle: 'Estrategias de descuento dinámico para productos de lenta rotación y combos de alta conversión.',
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
  onClose,
  onApplyAction,
}) {
  const meta = moduleMeta[type] || moduleMeta.precio;
  const [items, setItems] = useState(() => initialItemsProp || defaultModuleSuggestions[type] || []);

  useEffect(() => {
    if (initialItemsProp && initialItemsProp.length > 0) {
      setItems(initialItemsProp);
    }
  }, [initialItemsProp]);

  const handleFieldChange = (id, field, value) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleStepQuantity = (id, delta) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, cantidadDeseada: Math.max(1, (item.cantidadDeseada || item.stockSugerido) + delta) }
          : item
      )
    );
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
              ✓ Todas las sugerencias de este módulo han sido atendidas.
            </div>
          ) : (
            items.map((item) => (
              <article key={item.id} className="mac-item-card">
                {/* 1. Imagen / Emoji del producto */}
                <div className="mac-item-visual">{item.emoji}</div>

                {/* 2. Contenido Central */}
                <div className="mac-item-content">
                  {/* Nombre y Badge */}
                  <div className="mac-item-header-row">
                    <h3 className="mac-item-title">{item.name}</h3>
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
                          <strong className="mac-val-current">{item.stockActual} u.</strong>
                        </div>
                        <div className="mac-metric-point">
                          <span className="mac-dot-suggested" />
                          <span>Sugerido reposición:</span>
                          <strong className="mac-val-suggested">+{item.stockSugerido} u.</strong>
                        </div>
                        <span className="mac-range-tag">Stock objetivo: {item.stockObjetivo} u.</span>
                      </>
                    )}

                    {type === 'promocion' && (
                      <>
                        <div className="mac-metric-point">
                          <span className="mac-dot-current" />
                          <span>Precio normal:</span>
                          <strong className="mac-val-current">${Number(item.precioRegular).toFixed(2)}</strong>
                        </div>
                        <div className="mac-metric-point">
                          <span className="mac-dot-suggested" />
                          <span>Precio con descuento:</span>
                          <strong className="mac-val-suggested">${Number(item.precioPromo).toFixed(2)}</strong>
                        </div>
                        <span className="mac-range-tag">Horario: {item.horario}</span>
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
                            >
                              −
                            </button>
                            <span className="mac-stepper-val">
                              {item.cantidadDeseada ?? item.stockSugerido}
                            </span>
                            <button
                              type="button"
                              className="mac-stepper-btn"
                              onClick={() => handleStepQuantity(item.id, 1)}
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div className="mac-input-col">
                          <label>Fecha programada de entrega</label>
                          <input
                            type="text"
                            className="mac-text-input"
                            value={item.fechaProgramada}
                            onChange={(e) => handleFieldChange(item.id, 'fechaProgramada', e.target.value)}
                          />
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
                            value={item.descuentoDeseado ?? item.descuentoSugerido}
                            onChange={(e) => handleFieldChange(item.id, 'descuentoDeseado', e.target.value)}
                          />
                        </div>
                        <div className="mac-input-col">
                          <label>Vigencia u horario</label>
                          <input
                            type="text"
                            className="mac-text-input"
                            value={item.horario}
                            onChange={(e) => handleFieldChange(item.id, 'horario', e.target.value)}
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
                    >
                      {meta.confirmLabel}
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
