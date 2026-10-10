import { useState, useEffect, useRef } from 'react';
import './StoreView.css';
import InventoryModal from './InventoryModal';
import UnifiedSuggestionModal from './UnifiedSuggestionModal';
import {
  getDashboardData,
  getStoreInventory,
  getStoreRecommendations,
  getRecommendationCounts,
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
  const [recCounts, setRecCounts] = useState(null);

  // Estado del Avatar: determinado automáticamente por el rendimiento real de la sucursal (no editable manualmente por el cliente)
  const avatarMood = (dashboardData?.animo?.estado === 'triste' || (store?.variationPct != null && store.variationPct < -5) || store?.status === 'low' || store?.avatar === 'worried')
    ? 'bad'
    : 'good';

  // Modales abiertos
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [activeSuggestionModal, setActiveSuggestionModal] = useState(null); // 'reposicion' | 'promocion' | 'precio' | null

  // Movimiento libre (arrastrable) de la burbuja de diálogo del personaje
  const [bubbleOffset, setBubbleOffset] = useState({ x: 0, y: 0 });
  const [isDraggingBubble, setIsDraggingBubble] = useState(false);
  const dragStartRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0 });

  const handleBubbleMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsDraggingBubble(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: bubbleOffset.x,
      initialY: bubbleOffset.y,
    };
  };

  const handleBubbleTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    setIsDraggingBubble(true);
    dragStartRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      initialX: bubbleOffset.x,
      initialY: bubbleOffset.y,
    };
  };

  useEffect(() => {
    if (!isDraggingBubble) return;

    const handleMouseMove = (e) => {
      const dx = e.clientX - dragStartRef.current.startX;
      const dy = e.clientY - dragStartRef.current.startY;
      setBubbleOffset({
        x: dragStartRef.current.initialX + dx,
        y: dragStartRef.current.initialY + dy,
      });
    };

    const handleTouchMove = (e) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      const dx = touch.clientX - dragStartRef.current.startX;
      const dy = touch.clientY - dragStartRef.current.startY;
      setBubbleOffset({
        x: dragStartRef.current.initialX + dx,
        y: dragStartRef.current.initialY + dy,
      });
    };

    const handleEndDrag = () => {
      setIsDraggingBubble(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleEndDrag);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleEndDrag);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEndDrag);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEndDrag);
    };
  }, [isDraggingBubble]);

  // Carga inicial de datos de la sucursal
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      const [dash, inv, recs, counts] = await Promise.all([
        getDashboardData(storeId),
        getStoreInventory(storeId),
        getStoreRecommendations(storeId),
        getRecommendationCounts(storeId),
      ]);

      if (isMounted) {
        if (dash) setDashboardData(dash);
        if (inv) setInventoryList(inv);
        if (recs) setRecommendations(recs);
        if (counts) setRecCounts(counts);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [storeId]);

  // Carga reactiva de sugerencias por tipo al abrir el modal
  useEffect(() => {
    if (!activeSuggestionModal) return;
    const hasItems = recommendations.some((r) => r.tipo === activeSuggestionModal);
    if (!hasItems) {
      getStoreRecommendations(storeId, activeSuggestionModal).then((recs) => {
        if (recs && recs.length > 0) {
          setRecommendations((prev) => {
            const others = prev.filter((r) => r.tipo !== activeSuggestionModal);
            return [...others, ...recs];
          });
          getRecommendationCounts(storeId).then((c) => {
            if (c) setRecCounts(c);
          });
        }
      });
    }
  }, [activeSuggestionModal, storeId, recommendations]);

  // Aceptar / Rechazar recomendación con verificación de respuesta
  const handleAcceptRec = async (recId, recTitle, payload = {}) => {
    const res = await acceptRecommendationApi(recId, payload);
    if (res.ok) {
      setRecommendations((prev) => prev.filter((r) => r.id !== recId));
      getRecommendationCounts(storeId).then((c) => {
        if (c) setRecCounts(c);
      });
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
      getRecommendationCounts(storeId).then((c) => {
        if (c) setRecCounts(c);
      });
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

  // Conteo de recomendaciones en la DB de cada tipo y linkeado a la sucursal
  const reposicionCount = recCounts?.conteos?.reposicion?.total ?? recommendations.filter((r) => r.tipo === 'reposicion').length;
  const promocionCount = recCounts?.conteos?.promocion?.total ?? recommendations.filter((r) => r.tipo === 'promocion').length;
  const precioCount = recCounts?.conteos?.precio?.total ?? recommendations.filter((r) => r.tipo === 'precio').length;
  const totalCount = recCounts?.total ?? (reposicionCount + promocionCount + precioCount);

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
              {(mejores.productos || []).slice(0, 5).map((prod, idx) => (
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
              {(peores.productos || []).slice(0, 5).map((prod, idx) => (
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
            {/* Globo de diálogo con soporte de movimiento libre */}
            <div
              className={`avatar-speech-bubble ${isDraggingBubble ? 'is-dragging' : ''}`}
              style={{
                transform: `translate(calc(-50% + ${bubbleOffset.x}px), ${bubbleOffset.y}px)`,
              }}
              onMouseDown={handleBubbleMouseDown}
              onTouchStart={handleBubbleTouchStart}
              onDoubleClick={() => setBubbleOffset({ x: 0, y: 0 })}
              title="Arrastra para mover libremente (Doble clic para restablecer)"
            >
              {avatarMood === 'good'
                ? `¡Hola! Bienvenido a ${store?.name || 'nuestra sucursal'}. Las ventas de café van en aumento y el turno está operando al 100%.`
                : `¡Alerta operativa! Detectamos baja rotación en repostería y 2 productos con stock crítico para el fin de semana.`}
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

        {/* COLUMNA DERECHA: PANELES DE SUGERENCIAS IA (SOLO COUNT EN DB LINKEADO A LA SUCURSAL) */}
        <section className="store-col-right" aria-label="Sugerencias operativas de IA">
          <header className="recs-header-wrap">
            <div className="recs-header-left">
              <h2>Sugerencias de IA</h2>
            </div>
          </header>

          {/* BOTÓN 1: REPOSICIÓN (COUNT DE DB LINKEADO A SUCURSAL) */}
          <button
            type="button"
            className="big-suggestion-card reposicion"
            onClick={() => setActiveSuggestionModal('reposicion')}
            title={`Ver ${reposicionCount} recomendaciones de reposición para ${store?.name || storeId}`}
          >
            <div className="big-card-top">
              <div className="big-card-icon-wrap amber">📦</div>
              <div className="big-card-meta">
                <span className="big-card-badge alta">Reposición</span>
                <h3 className="big-card-title">Reposición de Stock</h3>
              </div>
            </div>

            <div className="big-card-count-block">
              <div className="big-card-count-stat">
                <span className="big-card-count-number">{reposicionCount}</span>
                <span className="big-card-count-unit">
                  {reposicionCount === 1 ? 'recomendación en DB' : 'recomendaciones en DB'}
                </span>
              </div>
            </div>

            <div className="big-card-cta">
              <span>Abrir orden de reposición</span>
              <span className="big-card-arrow">→</span>
            </div>
          </button>

          {/* BOTÓN 2: PROMOCIONES (COUNT DE DB LINKEADO A SUCURSAL) */}
          <button
            type="button"
            className="big-suggestion-card promocion"
            onClick={() => setActiveSuggestionModal('promocion')}
            title={`Ver ${promocionCount} promociones dinámicas para ${store?.name || storeId}`}
          >
            <div className="big-card-top">
              <div className="big-card-icon-wrap purple">🏷️</div>
              <div className="big-card-meta">
                <span className="big-card-badge media">Promoción</span>
                <h3 className="big-card-title">Promociones Dinámicas</h3>
              </div>
            </div>

            <div className="big-card-count-block">
              <div className="big-card-count-stat">
                <span className="big-card-count-number">{promocionCount}</span>
                <span className="big-card-count-unit">
                  {promocionCount === 1 ? 'recomendación en DB' : 'recomendaciones en DB'}
                </span>
              </div>
            </div>

            <div className="big-card-cta">
              <span>Gestionar y activar promociones</span>
              <span className="big-card-arrow">→</span>
            </div>
          </button>

          {/* BOTÓN 3: PRECIOS (COUNT DE DB LINKEADO A SUCURSAL) */}
          <button
            type="button"
            className="big-suggestion-card precio"
            onClick={() => setActiveSuggestionModal('precio')}
            title={`Ver ${precioCount} ajustes de precios para ${store?.name || storeId}`}
          >
            <div className="big-card-top">
              <div className="big-card-icon-wrap emerald">💲</div>
              <div className="big-card-meta">
                <span className="big-card-badge baja">Precios</span>
                <h3 className="big-card-title">Ajuste de Precios</h3>
              </div>
            </div>

            <div className="big-card-count-block">
              <div className="big-card-count-stat">
                <span className="big-card-count-number">{precioCount}</span>
                <span className="big-card-count-unit">
                  {precioCount === 1 ? 'recomendación en DB' : 'recomendaciones en DB'}
                </span>
              </div>
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
          store={store}
          items={recommendations.filter((r) => r.tipo === activeSuggestionModal)}
          onClose={() => setActiveSuggestionModal(null)}
          onApplyAction={async (item, actionType) => {
            if (actionType === 'accept') {
              const payload = {};
              if (item.tipo === 'reposicion' && item.cantidadDeseada) payload.cantidad = Number(item.cantidadDeseada);
              if (item.tipo === 'promocion' && item.descuentoDeseado) payload.descuento_pct = Number(item.descuentoDeseado);
              if (item.tipo === 'precio' && item.precioDeseado) payload.precio = Number(item.precioDeseado);
              await handleAcceptRec(item.id, item.name, payload);
            } else {
              await handleRejectRec(item.id, item.name, item.motivo);
            }
          }}
        />
      )}
    </div>
  );
}
