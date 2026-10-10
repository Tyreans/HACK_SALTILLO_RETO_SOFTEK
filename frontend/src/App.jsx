import { useState, useEffect, useCallback } from 'react';
import './App.css';
import DashboardMap from './components/DashboardMap';
import StoreView from './components/StoreView';
import AddStoreModal from './components/AddStoreModal';
import ChatDrawer from './components/ChatDrawer';
import SuccessToast from './components/SuccessToast';
import { initialStores } from './data/storesData';
import { getStoresListApi } from './services/storeApi';

export default function App() {
  const [stores, setStores] = useState(initialStores);
  const [selectedStore, setSelectedStore] = useState(initialStores[0]);
  const [currentView, setCurrentView] = useState('map'); // 'map' | 'store'
  const [isAddStoreOpen, setIsAddStoreOpen] = useState(false);

  // Cargar lista de tiendas en vivo desde la API de backend (GET /api/tiendas)
  useEffect(() => {
    async function loadStores() {
      const apiStores = await getStoresListApi();
      if (apiStores && apiStores.length > 0) {
        const merged = apiStores.map((s, idx) => {
          const existing = initialStores.find((st) => st.id === s.store_id);
          const angle = (idx / apiStores.length) * 2 * Math.PI;
          const radius = 0.010 + (idx % 4) * 0.005;
          const defaultLat = 25.4248 + Math.cos(angle) * radius;
          const defaultLng = -101.0035 + Math.sin(angle) * radius;

          return {
            id: s.store_id,
            name: s.store_name,
            site_name: s.site_name,
            city: s.region ? `${s.region} · Saltillo` : 'Saltillo, COAH',
            address: s.site_name ? `${s.site_name} (${s.format})` : (existing?.address || 'Sucursal Otzo'),
            format: s.format || 'Full Counter',
            lat: existing?.lat || defaultLat,
            lng: existing?.lng || defaultLng,
            sales: existing?.sales || 120000,
            salesFormatted: existing?.salesFormatted || '$120.0k',
            variationPct: existing?.variationPct || 8.5,
            status: existing?.status || ((idx % 3 === 0) ? 'top' : (idx % 5 === 0) ? 'low' : 'normal'),
            tickets: existing?.tickets || 950,
            marginPct: existing?.marginPct || 72.0,
            mermaPct: existing?.mermaPct || 3.5,
            avatar: existing?.avatar || 'neutral',
            hours: s.opening_time && s.closing_time ? `${s.opening_time} - ${s.closing_time}` : (existing?.hours || '24 Horas'),
          };
        });
        setStores(merged);
      }
    }
    loadStores();
  }, []);

  // Chatbot Gemini drawer state
  const [chatDrawer, setChatDrawer] = useState({ isOpen: false, query: '' });

  // Notificaciones Toast
  const [alert, setAlert] = useState(null);

  // Sincronización bidireccional con URL (?tienda=S001 o ?id=S001)
  const syncFromUrl = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    const storeId = params.get('tienda') || params.get('id');

    if (storeId) {
      const match = stores.find((s) => s.id.toLowerCase() === storeId.toLowerCase());
      if (match) {
        setSelectedStore(match);
      } else {
        // Si no existe, crear o asociar id básico
        setSelectedStore({
          id: storeId.toUpperCase(),
          name: `Sucursal ${storeId.toUpperCase()}`,
          format: 'Sucursal Otzo',
          salesFormatted: '$120.0k',
          variationPct: 15.0,
          status: 'top',
        });
      }
      setCurrentView('store');
    } else {
      setCurrentView('map');
    }
  }, [stores]);

  useEffect(() => {
    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, [syncFromUrl]);

  useEffect(() => {
    if (!alert) return undefined;
    const timer = window.setTimeout(() => setAlert(null), 3500);
    return () => window.clearTimeout(timer);
  }, [alert]);

  // Selección de tienda en el mapa o buscador: REDIRIGE a la pantalla secundaria StoreView (NO es un popup)
  const handleSelectStore = (store) => {
    setSelectedStore(store);
    setCurrentView('store');
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('tienda', store.id);
    window.history.pushState({}, '', newUrl.toString());
  };

  // Volver a la pantalla del mapa
  const handleBackToMap = () => {
    setCurrentView('map');
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('tienda');
    newUrl.searchParams.delete('id');
    window.history.pushState({}, '', newUrl.pathname);
  };

  // Abrir Chatbot con consulta inicial
  const handleAskGemini = (queryText) => {
    setChatDrawer({ isOpen: true, query: queryText || '' });
  };

  // Agregar nueva sucursal en vivo al mapa (+)
  const handleAddStore = (newStore) => {
    setStores((prev) => [newStore, ...prev]);
    setSelectedStore(newStore);
    setAlert({
      type: 'success',
      message: `¡Sucursal "${newStore.name}" ubicada y agregada al mapa en tiempo real!`,
    });
  };

  return (
    <div className="app-viewport">
      {/* Toast Flotante para notificaciones de acciones */}
      {alert && <SuccessToast message={alert.message} />}

      {/* VISTA 1: DASHBOARD PRINCIPAL (MAPA STADIA + BÚSQUEDA + PANELES FLOTANTES) */}
      {currentView === 'map' && (
        <DashboardMap
          stores={stores}
          selectedStore={selectedStore}
          onSelectStore={handleSelectStore}
          onOpenAddStore={() => setIsAddStoreOpen(true)}
          onAskGemini={handleAskGemini}
        />
      )}

      {/* VISTA 2: PANTALLA SECUNDARIA DE SUCURSAL (AVATAR DETRÁS DE DESKTOP.PNG + PANELES FLOTANTES BLANCOS) */}
      {currentView === 'store' && selectedStore && (
        <StoreView
          store={selectedStore}
          onBackToMap={handleBackToMap}
          onAskGemini={handleAskGemini}
          onShowAlert={setAlert}
        />
      )}

      {/* MODAL: AGREGAR NUEVA SUCURSAL (+) */}
      {isAddStoreOpen && (
        <AddStoreModal
          onClose={() => setIsAddStoreOpen(false)}
          onAddStore={handleAddStore}
        />
      )}

      {/* DRAWER: CHATBOT GEMINI */}
      {chatDrawer.isOpen && (
        <ChatDrawer
          initialQuery={chatDrawer.query}
          store={selectedStore}
          onClose={() => setChatDrawer({ isOpen: false, query: '' })}
          onNavigateToStore={(targetStoreId) => {
            const found = stores.find((s) => s.id === targetStoreId);
            if (found) {
              handleSelectStore(found);
              setChatDrawer({ isOpen: false, query: '' });
            }
          }}
        />
      )}
    </div>
  );
}
