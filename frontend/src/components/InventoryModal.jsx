import { useState, useMemo } from 'react';
import { downloadInventoryExcel } from '../services/storeApi';
import { sendAssistantMessage } from '../services/assistantApi';
import './InventoryModal.css';

export default function InventoryModal({
  store,
  inventory = [],
  onClose,
  onOpenRestock,
  onAskGemini,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'low' | 'normal'
  const [showAiBox, setShowAiBox] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSessionId, setAiSessionId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Filtrado de productos
  const filteredItems = useMemo(() => {
    return inventory.filter((item) => {
      const matchSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.presentation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku?.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchSearch) return false;

      if (filterStatus === 'low') return item.is_low;
      if (filterStatus === 'normal') return !item.is_low;
      return true;
    });
  }, [inventory, searchTerm, filterStatus]);

  // Paginación
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const toggleFilter = () => {
    if (filterStatus === 'all') setFilterStatus('low');
    else if (filterStatus === 'low') setFilterStatus('normal');
    else setFilterStatus('all');
    setCurrentPage(1);
  };

  const handleAskAi = async (customPrompt) => {
    const query = customPrompt || aiQuestion;
    if (!query.trim()) return;

    setIsAiLoading(true);
    setAiAnswer('');

    try {
      const storeContext = store
        ? ` de la sucursal ${store.name || store.id} (${store.id})`
        : '';
      const prompt = `[Contexto de inventario${storeContext}]. ${query}`;
      const data = await sendAssistantMessage(prompt, aiSessionId);
      if (data.sessionId) setAiSessionId(data.sessionId);
      setAiAnswer(data.response);
    } catch (error) {
      console.error('No se pudo consultar el asistente desde inventario:', error);
      setAiAnswer(`⚠️ ${error.message}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="inv-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="inv-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <header className="inv-modal-header">
          <h2 className="inv-modal-title">Inventario de productos</h2>
          <button className="inv-modal-close" onClick={onClose} aria-label="Cerrar modal">
            ✕
          </button>
        </header>

        {/* Toolbar */}
        <div className="inv-toolbar">
          <div className="inv-search-wrap">
            <span className="inv-search-icon">🔍</span>
            <input
              type="text"
              className="inv-search-input"
              placeholder="Buscar producto..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="inv-actions-group">
            {/* Botón IA pedido expresamente por el usuario */}
            <button
              type="button"
              className="inv-ai-btn"
              onClick={() => setShowAiBox(!showAiBox)}
              title="Pedir preguntas o recomendaciones sobre el inventario a Gemini"
            >
              <span>✨</span>
              <span>Preguntar a IA</span>
            </button>

            {/* Filtrar por estatus */}
            <button
              type="button"
              className="inv-filter-btn"
              onClick={toggleFilter}
              title="Alternar filtro de alertas"
            >
              <span>🎯</span>
              <span>
                {filterStatus === 'all'
                  ? 'Filtrar por estatus'
                  : filterStatus === 'low'
                    ? 'Estatus: Solo Bajos'
                    : 'Estatus: Stock Óptimo'}
              </span>
            </button>

            {/* Exportar Excel */}
            <button
              type="button"
              className="inv-filter-btn"
              onClick={() => downloadInventoryExcel(store?.id || 'S001')}
              title="Descargar reporte completo en formato Excel (.xlsx)"
            >
              <span>📥</span>
              <span>Exportar Excel</span>
            </button>
          </div>
        </div>

        {/* AI Assistant drawer box inline */}
        {showAiBox && (
          <div className="inv-ai-box">
            <div className="inv-ai-box-header">
              <span className="inv-ai-box-title">
                <span>🤖</span> Asistente IA para Inventario (Gemini)
              </span>
              <button
                type="button"
                onClick={() => onAskGemini && onAskGemini('¿Cuál es el estado del inventario de esta tienda?')}
                style={{ background: 'none', border: 'none', color: '#6d28d9', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Abrir en Chat completo →
              </button>
            </div>

            <div className="inv-ai-chips">
              <button
                type="button"
                className="inv-ai-chip"
                onClick={() => handleAskAi('¿Cuáles productos tienen mayor riesgo de quiebre?')}
              >
                ¿Cuáles tienen riesgo de quiebre?
              </button>
              <button
                type="button"
                className="inv-ai-chip"
                onClick={() => handleAskAi('¿Qué productos tienen riesgo de merma o caducidad?')}
              >
                ¿Riesgo de merma por caducidad?
              </button>
              <button
                type="button"
                className="inv-ai-chip"
                onClick={() => handleAskAi('¿Cuál es la recomendación prioritaria de reabastecimiento?')}
              >
                ¿Recomendación prioritaria?
              </button>
            </div>

            <div className="inv-ai-input-row">
              <input
                type="text"
                className="inv-ai-input"
                placeholder="Escribe una pregunta sobre el inventario..."
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAskAi()}
              />
              <button
                type="button"
                className="inv-ai-submit-btn"
                onClick={() => handleAskAi()}
                disabled={isAiLoading}
              >
                {isAiLoading ? 'Analizando...' : 'Consultar'}
              </button>
            </div>

            {aiAnswer && <div className="inv-ai-response">{aiAnswer}</div>}
          </div>
        )}

        {/* Tabla principal */}
        <div className="inv-table-wrap">
          <table className="inv-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Stock actual</th>
                <th>Stock mínimo</th>
                <th>Precio venta</th>
                <th>Último reabastecimiento</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                    No se encontraron productos con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className="inv-product-name">{item.name}</span>
                      <span className="inv-product-sub">{item.presentation}</span>
                    </td>
                    <td>
                      <div className="inv-stock-cell">
                        <span>{item.stock_actual}</span>
                        {item.is_low && <span className="inv-badge-low">Bajo</span>}
                      </div>
                    </td>
                    <td>{item.stock_minimo}</td>
                    <td>{item.precio_venta}</td>
                    <td>{item.ultimo_reabastecimiento}</td>
                    <td>
                      <div className="inv-actions-cell">
                        <button
                          type="button"
                          className="inv-row-btn"
                          onClick={() => alert(`Editar producto: ${item.name}`)}
                          title="Editar detalles"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          type="button"
                          className="inv-row-btn reorder"
                          onClick={() => {
                            if (onOpenRestock) onOpenRestock(store);
                          }}
                          title="Reordenar stock"
                        >
                          🔄 Reordenar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <footer className="inv-modal-footer">
          <span className="inv-pagination-info">
            Mostrando {filteredItems.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-
            {Math.min(currentPage * itemsPerPage, filteredItems.length)} de {filteredItems.length} resultados
          </span>

          <div className="inv-footer-right">
            <div className="inv-pagination-nav">
              <button
                type="button"
                className="inv-page-arrow"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                ‹
              </button>
              <button
                type="button"
                className="inv-page-arrow"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                ›
              </button>
            </div>

            <button type="button" className="inv-btn-close" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
