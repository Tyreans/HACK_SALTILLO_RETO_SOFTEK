import { useState, useEffect, useMemo } from 'react';
import './StoreView.css';
import InventoryModal from './InventoryModal';
import UnifiedSuggestionModal from './UnifiedSuggestionModal';
import {
  getDashboardData,
  getStoreInventory,
  getStoreRecommendations,
  fallbackStoreDetails,
  acceptRecommendationApi,
  rejectRecommendationApi,
} from '../services/storeApi';

export default function StoreView({
  store,
  onBackToMap,
  onAskGemini,
  onShowAlert,
}) {
  const storeId = store?.id || 'S001';

  // Datos dinámicos del panel izquierdo
  const [dashboardData, setDashboardData] = useState(() => fallbackStoreDetails[storeId] || fallbackStoreDetails.S001);
  const [inventoryList, setInventoryList] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState('');

  // Estado del Avatar: predeterminado siempre en 'good' (AVATAR-GOOD.gif), conmutable a 'bad'
  const [avatarMood, setAvatarMood] = useState(() => (store?.variationPct < -5 ? 'bad' : 'good'));

  // Modales abiertos
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [activeSuggestionModal, setActiveSuggestionModal] = useState(null); // 'reposicion' | 'promocion' | 'precio' | null

  // Carga inicial de datos de la sucursal
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      const results = await Promise.allSettled([
        getDashboardData(storeId),
        getStoreInventory(storeId),
        getStoreRecommendations(storeId),
      ]);

      if (isMounted) {
        const [dash, inv, recs] = results;
        if (dash.status === 'fulfilled' && dash.value) setDashboardData(dash.value);
        if (inv.status === 'fulfilled' && inv.value) setInventoryList(inv.value);
        if (recs.status === 'fulfilled') setRecommendations(recs.value);
        if (recs.status === 'rejected') {
          onShowAlert?.({ type: 'error', message: `No se pudieron cargar recomendaciones: ${recs.reason.message}` });
        }
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [storeId, onShowAlert]);

  // Carga reactiva de sugerencias por tipo al abrir el modal
  useEffect(() => {
    if (!activeSuggestionModal) return;
    let isMounted = true;
    setRecommendationsLoading(true);
    setRecommendationsError('');
    getStoreRecommendations(storeId, activeSuggestionModal).then((recs) => {
      if (isMounted) {
        setRecommendations((prev) => {
          const others = prev.filter((r) => r.tipo !== activeSuggestionModal);
          return [...others, ...recs];
        });
      }
    }).catch((error) => {
      if (!isMounted) return;
      setRecommendationsError(error.message);
      onShowAlert?.({ type: 'error', message: `No se pudieron cargar las recomendaciones: ${error.message}` });
    }).finally(() => {
      if (isMounted) setRecommendationsLoading(false);
    });
    return () => {
      isMounted = false;
    };
  }, [activeSuggestionModal, storeId, onShowAlert]);

  // Aceptar / Rechazar recomendación con verificación de respuesta
  const handleAcceptRec = async (recId, recTitle, payload = {}) => {
    const res = await acceptRecommendationApi(recId, payload);
    if (res.ok) {
      setRecommendations((prev) => prev.filter((r) => r.id !== recId));
      onShowAlert?.({
        type: 'success',
        message: `Recomendación aceptada: "${recTitle}". Enviada a ejecución.`,
      });
      return true;
    } else {
      onShowAlert?.({
        type: 'error',
        message: `No se pudo aceptar: ${res.error || 'Error en el servidor'}`,
      });
      return false;
    }
  };

  const handleRejectRec = async (recId, recTitle, motivo = '') => {
    const res = await rejectRecommendationApi(recId, motivo || 'Rechazado por gerente de sucursal');
    if (res.ok) {
      setRecommendations((prev) => prev.filter((r) => r.id !== recId));
      onShowAlert?.({
        type: 'info',
        message: `Recomendación descartada: "${recTitle}". Guardado en memoria IA.`,
      });
      return true;
    } else {
      onShowAlert?.({
        type: 'error',
        message: `No se pudo descartar: ${res.error || 'Error en el servidor'}`,
      });
      return false;
    }
  };

  const mejores = dashboardData?.mejores_ventas || fallbackStoreDetails.S001.mejores_ventas;
  const peores = dashboardData?.peores_ventas || fallbackStoreDetails.S001.peores_ventas;
  const estadisticas = dashboardData?.estadisticas || fallbackStoreDetails.S001.estadisticas;
  const inventoryBadge = dashboardData?.inventario_badge || { bajos: 2, total_items: 48 };
  const restockRecommendations = useMemo(
    () => recommendations.filter((r) => r.tipo === 'reposicion' && r.estado === 'pendiente'),
    [recommendations]
  );
  const promoRecommendations = useMemo(
    () => recommendations.filter((r) => r.tipo === 'promocion' && r.estado === 'pendiente'),
    [recommendations]
  );
  const activeRecommendations = useMemo(
    () => recommendations.filter((r) => r.tipo === activeSuggestionModal
      && (activeSuggestionModal === 'precio' || r.estado === 'pendiente')),
    [recommendations, activeSuggestionModal]
  );
  const suggestionLabel = (item) => item.tipo === 'reposicion'
    ? `${item.name} (+${item.stockSugerido ?? item.cantidadDeseada ?? '—'} u.)`
    : `${item.name} (${item.descuentoSugerido ?? '—'}% OFF)`;
  const badgeForRecommendations = (items) => {
    if (!items.length) return { className: 'baja', text: 'Sin pendientes' };
    if (items.some((item) => item.prioridad === 'alta')) return { className: 'alta', text: 'Prioridad alta' };
    if (items.some((item) => item.prioridad === 'media')) return { className: 'media', text: 'Prioridad media' };
    return { className: 'baja', text: 'Prioridad baja' };
  };
  const restockBadge = badgeForRecommendations(restockRecommendations);
  const promoBadge = badgeForRecommendations(promoRecommendations);

  return (
    <div className="store-view-container">
      {/* 1. BARRA SUPERIOR DE NAVEGACIÓN */}
      <header className="store-view-navbar">
        <div className="store-nav-left">
          <button type="button" className="store-back-btn" onClick={onBackToMap}>
            <span>←</span>
            <span>Volver al mapa</span>
          </button>

          <div className="store-meta-header">
            <h1 className="store-title">{store?.name || 'Sucursal Otzo'}</h1>
            <span className="store-id-pill">{storeId}</span>
            <span className={`store-perf-badge ${avatarMood}`}>
              {avatarMood === 'good' ? 'Rendimiento Óptimo 🌟' : 'Atención Requerida ⚠️'}
            </span>
          </div>
        </div>

        <div className="store-nav-right">
          {/* Switch de modo de avatar para pruebas Good/Bad */}
          <div className="avatar-mood-switcher" title="Alternar estado de ánimo del avatar según rendimiento">
            <button
              type="button"
              className={`mood-btn ${avatarMood === 'good' ? 'active good' : ''}`}
              onClick={() => setAvatarMood('good')}
            >
              😊 Good
            </button>
            <button
              type="button"
              className={`mood-btn ${avatarMood === 'bad' ? 'active bad' : ''}`}
              onClick={() => setAvatarMood('bad')}
            >
              😟 Alert
            </button>
          </div>

          <button
            type="button"
            className="store-gemini-btn"
            onClick={() => onAskGemini?.(`Dame un análisis completo de la tienda ${store?.name || storeId}`)}
          >
            <span>✨</span>
            <span>Consultar Gemini</span>
          </button>

          <img src="/images/LOGO.png" alt="Otzo Logo" className="store-nav-logo" />
        </div>
      </header>

      {/* 2. LAYOUT PRINCIPAL: 3 COLUMNAS */}
      <main className="store-view-main">
        {/* COLUMNA IZQUIERDA: PANELES FLOTANTES (BOSQUEJO 3 DE 5) */}
        <section className="store-col-left" aria-label="Métricas y estadísticas de ventas">
          {/* Panel 1: Mejores ventas */}
          <article className="store-panel-card">
            <div className="store-panel-header">
              <h3 className="store-panel-title">Mejores ventas</h3>
              <span className="store-pill-badge green">{mejores.variacion || '+18%'}</span>
            </div>

            <div className="store-stat-block">
              <p className="store-stat-sub">Ejemplo · 3 productos</p>
              <p className="store-stat-amount">{mejores.total || '$12.4k'}</p>
              <p className="store-stat-footer">{mejores.unidades || 248} unidades vendidas</p>
            </div>

            <div className="store-products-list">
              {(mejores.productos || []).map((prod, idx) => (
                <div key={idx} className="store-product-row">
                  <div className="store-prod-left">
                    <span className="store-prod-rank">{prod.rank || idx + 1}</span>
                    <span className="store-prod-name">{prod.name || prod.producto_nombre}</span>
                  </div>
                  <strong className="store-prod-amount">{prod.amount || `$${prod.venta || '4.8k'}`}</strong>
                </div>
              ))}
            </div>
          </article>

          {/* Panel 2: Peores ventas */}
          <article className="store-panel-card">
            <div className="store-panel-header">
              <h3 className="store-panel-title">Peores ventas</h3>
              <span className="store-pill-badge red">{peores.variacion || '-12%'}</span>
            </div>

            <div className="store-stat-block">
              <p className="store-stat-sub">Ejemplo · 3 productos</p>
              <p className="store-stat-amount">{peores.total || '$1.8k'}</p>
              <p className="store-stat-footer">{peores.unidades || 36} unidades vendidas</p>
            </div>

            <div className="store-products-list">
              {(peores.productos || []).map((prod, idx) => (
                <div key={idx} className="store-product-row">
                  <div className="store-prod-left">
                    <span className="store-prod-rank">{prod.rank || idx + 1}</span>
                    <span className="store-prod-name">{prod.name || prod.producto_nombre}</span>
                  </div>
                  <strong className="store-prod-amount">{prod.amount || `$${prod.venta || '640'}`}</strong>
                </div>
              ))}
            </div>
          </article>

          {/* Panel 3: Rendimiento de la tienda (Estadísticas y porcentajes) */}
          <article className="store-panel-card">
            <div className="store-panel-header">
              <h3 className="store-panel-title">Estadísticas y porcentajes</h3>
              <span className="store-pill-badge blue">Actualizado</span>
            </div>

            <div className="store-kpi-list">
              <div className="store-kpi-row">
                <span className="store-kpi-label">Ticket promedio</span>
                <span className="store-kpi-value">{estadisticas.ticket_promedio?.valor ? `$${estadisticas.ticket_promedio.valor}` : estadisticas.ticket_promedio || '$24.50'}</span>
              </div>
              <div className="store-kpi-row">
                <span className="store-kpi-label">Conversión</span>
                <span className="store-kpi-value">{estadisticas.conversion_pct?.valor ? `${estadisticas.conversion_pct.valor}%` : estadisticas.conversion_pct || '3.8%'}</span>
              </div>
              <div className="store-kpi-row">
                <span className="store-kpi-label">Retención</span>
                <span className="store-kpi-value">{estadisticas.retencion_pct || '28%'}</span>
              </div>
              <div className="store-kpi-row">
                <span className="store-kpi-label">Margen neto</span>
                <span className="store-kpi-value">{estadisticas.margen_pct?.valor ? `${estadisticas.margen_pct.valor}%` : estadisticas.margen_neto || '18%'}</span>
              </div>
            </div>
          </article>

          {/* Panel 4: Botón de Inventario (Caja con texto Inventario) */}
          <article
            className="store-panel-card store-inv-btn-card"
            onClick={() => setIsInventoryOpen(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setIsInventoryOpen(true)}
          >
            <div className="store-inv-card-inner">
              <div className="store-inv-card-left">
                <span className="store-inv-box-icon">📦</span>
                <div>
                  <div className="store-inv-card-title">Inventario</div>
                  <div className="store-inv-card-sub">Ver catálogo completo</div>
                </div>
              </div>
              <span className="store-pill-badge orange">{inventoryBadge.bajos || 2} bajos</span>
              <span className="store-inv-arrow">›</span>
            </div>
          </article>
        </section>

        {/* COLUMNA CENTRAL: ESCENARIO CON AVATAR DETRÁS DEL MOSTRADOR (DESKTOP.PNG) */}
        <section className="store-col-center" aria-label="Mostrador y encargado virtual de sucursal">
          <div className="desk-avatar-stage">
            {/* Globo de diálogo */}
            <div className="avatar-speech-bubble">
              {avatarMood === 'good'
                ? `¡Hola! Bienvenido a ${store?.name || 'nuestra sucursal'}. Revisa las recomendaciones para conocer el estado actual de la operación.`
                : restockRecommendations.length
                  ? `Hay ${restockRecommendations.length} recomendaciones de reposición pendientes. Revisa las cantidades calculadas con el inventario y las ventas disponibles.`
                  : 'No hay alertas de reposición pendientes cargadas. Consulta el módulo para generar recomendaciones actuales.'}
            </div>

            {/* Capa 1: Avatar (AVATAR-GOOD.gif o AVATAR-BAD.gif) */}
            <img
              src={avatarMood === 'good' ? '/images/AVATAR-GOOD.gif' : '/images/AVATAR-BAD.gif'}
              alt="Encargada de sucursal Otzo"
              className="avatar-image-layer"
            />

            {/* Capa 2: Escritorio y Mostrador (desktop.png) ENFRENTE del Avatar */}
            <img
              src="/images/desktop.png"
              alt="Mostrador Otzo con terminal POS y punto de venta"
              className="desk-image-layer"
            />

            {/* Sombra de suelo */}
            <div className="desk-stage-shadow" />
          </div>
        </section>

        {/* COLUMNA DERECHA: 3 BOTONES MUY GRANDES DE SUGERENCIAS IA */}
        <section className="store-col-right" aria-label="Sugerencias operativas de IA">
          <header className="recs-header-wrap">
            <div className="recs-header-left">
              <h2>Sugerencias de IA</h2>
              <p>3 módulos de optimización operativa</p>
            </div>
          </header>

          {/* BOTÓN 1 MUY GRANDE: REPOSICIÓN */}
          <button
            type="button"
            className="big-suggestion-card reposicion"
            onClick={() => setActiveSuggestionModal('reposicion')}
          >
            <div className="big-card-top">
              <div className="big-card-icon-wrap amber">📦</div>
              <div className="big-card-meta">
                <span className={`big-card-badge ${restockBadge.className}`}>{restockBadge.text}</span>
                <h3 className="big-card-title">Reposición de Stock</h3>
              </div>
            </div>
            <p className="big-card-desc">
              {restockRecommendations.length
                ? `${restockRecommendations.length} recomendaciones pendientes basadas en el inventario y el historial de ventas.`
                : 'Abre el módulo para consultar el inventario y generar recomendaciones actuales.'}
            </p>
            <div className="big-card-chips">
              {restockRecommendations.slice(0, 2).map((item) => (
                <span className="big-card-chip" key={item.id}>{item.emoji} {suggestionLabel(item)}</span>
              ))}
            </div>
            <div className="big-card-cta">
              <span>Abrir orden de reposición</span>
              <span className="big-card-arrow">→</span>
            </div>
          </button>

          {/* BOTÓN 2 MUY GRANDE: PROMOCIONES */}
          <button
            type="button"
            className="big-suggestion-card promocion"
            onClick={() => setActiveSuggestionModal('promocion')}
          >
            <div className="big-card-top">
              <div className="big-card-icon-wrap purple">🏷️</div>
              <div className="big-card-meta">
                <span className={`big-card-badge ${promoBadge.className}`}>{promoBadge.text}</span>
                <h3 className="big-card-title">Promociones Dinámicas</h3>
              </div>
            </div>
            <p className="big-card-desc">
              {promoRecommendations.length
                ? `${promoRecommendations.length} recomendaciones pendientes según el inventario y la fecha de retiro de productos.`
                : 'Abre el módulo para consultar inventario y fechas de retiro actuales.'}
            </p>
            <div className="big-card-chips">
              {promoRecommendations.slice(0, 2).map((item) => (
                <span className="big-card-chip" key={item.id}>{item.emoji} {suggestionLabel(item)}</span>
              ))}
            </div>
            <div className="big-card-cta">
              <span>Gestionar y activar promociones</span>
              <span className="big-card-arrow">→</span>
            </div>
          </button>

          {/* BOTÓN 3 MUY GRANDE: PRECIOS */}
          <button
            type="button"
            className="big-suggestion-card precio"
            onClick={() => setActiveSuggestionModal('precio')}
          >
            <div className="big-card-top">
              <div className="big-card-icon-wrap emerald">💲</div>
              <div className="big-card-meta">
                <span className="big-card-badge baja">Competitividad</span>
                <h3 className="big-card-title">Ajuste de Precios</h3>
              </div>
            </div>
            <p className="big-card-desc">
              Comparativa contra competidores zonales para maximizar volumen y margen.
            </p>
            <div className="big-card-chips">
              <span className="big-card-chip">🍌 Batido ($3.50 → $2.90)</span>
              <span className="big-card-chip">🍵 Té de jazmín ($2.80)</span>
            </div>
            <div className="big-card-cta">
              <span>Comparar y ajustar precios</span>
              <span className="big-card-arrow">→</span>
            </div>
          </button>
        </section>
      </main>

      {/* 3. MODALES Y POPUPS ESPECÍFICOS */}

      {/* Modal A: Inventario Completo (INVENTARIO_OPENED.png) */}
      {isInventoryOpen && (
        <InventoryModal
          store={store}
          inventory={inventoryList}
          onClose={() => setIsInventoryOpen(false)}
          onOpenRestock={() => {
            setIsInventoryOpen(false);
            setActiveSuggestionModal('reposicion');
          }}
          onAskGemini={onAskGemini}
        />
      )}

      {/* Modal B: POPUP UNIFICADO ESTILO MAC PARA SUGERENCIAS (SUGERENCIAS_PRECIOS.PNG) */}
      {activeSuggestionModal && (
        <UnifiedSuggestionModal
          type={activeSuggestionModal}
          items={activeRecommendations}
          isLoading={recommendationsLoading}
          error={recommendationsError}
          onClose={() => setActiveSuggestionModal(null)}
          onApplyAction={async (item, actionType) => {
            if (actionType === 'accept') {
              const payload = {};
              if (item.tipo === 'reposicion' && item.cantidadDeseada) payload.cantidad = Number(item.cantidadDeseada);
              if (item.tipo === 'promocion' && item.descuentoDeseado) payload.descuento_pct = Number(item.descuentoDeseado);
              if (item.tipo === 'promocion' && item.fechaInicio) payload.fecha_inicio = item.fechaInicio;
              if (item.tipo === 'promocion' && item.fechaFin) payload.fecha_fin = item.fechaFin;
              if (item.tipo === 'precio' && item.precioDeseado) payload.precio = Number(item.precioDeseado);
              return handleAcceptRec(item.id, item.name, payload);
            } else {
              return handleRejectRec(item.id, item.name, item.motivo);
            }
          }}
        />
      )}
    </div>
  );
}
