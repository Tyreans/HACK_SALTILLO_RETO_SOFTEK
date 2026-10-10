import { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './DashboardMap.css';

export default function DashboardMap({
  stores,
  selectedStore,
  onSelectStore,
  onOpenAddStore,
  onAskGemini,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef(new Map());

  // Estado del buscador y voz
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  // Filtrado de tiendas sobresalientes (Máximo 5 unidades en cada lista)
  const topStores = useMemo(
    () =>
      [...stores]
        .filter((s) => s.status === 'top')
        .sort((a, b) => (Number(b.variationPct) || 0) - (Number(a.variationPct) || 0))
        .slice(0, 5),
    [stores]
  );
  const lowStores = useMemo(
    () =>
      [...stores]
        .filter((s) => s.status === 'low')
        .sort((a, b) => (Number(a.variationPct) || 0) - (Number(b.variationPct) || 0))
        .slice(0, 5),
    [stores]
  );

  // Resultados de búsqueda
  const filteredStores = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return stores.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q)
    );
  }, [stores, searchQuery]);

  // Inicializar Leaflet con Stadia Maps (Alidade Smooth blanco/minimalista)
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Centro inicial: Saltillo Centro (como en Bosquejo.png)
    const initialCenter = [25.4248, -101.0035];
    const initialZoom = 14.5;

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: false,
      attributionControl: true,
      minZoom: 12,
      maxZoom: 18,
    });

    // Control de zoom en esquina inferior izquierda
    L.control.zoom({ position: 'bottomleft' }).addTo(map);

    // Stadia Maps Alidade Smooth (con fallback a CartoDB Positron en caso de cuota)
    const stadiaTileUrl = 'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png';
    const cartoFallbackUrl = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

    const baseLayer = L.tileLayer(stadiaTileUrl, {
      maxZoom: 20,
      attribution:
        '&copy; <a href="https://stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
    });

    // Si Stadia no carga (p. ej. sin api key en dominio no localhost), cambia automáticamente a Carto Positron
    baseLayer.on('tileerror', () => {
      if (!map._hasCartoFallback) {
        map._hasCartoFallback = true;
        map.removeLayer(baseLayer);
        L.tileLayer(cartoFallbackUrl, {
          maxZoom: 20,
          attribution: '&copy; CartoDB &copy; OpenStreetMap',
        }).addTo(map);
      }
    });

    baseLayer.addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Actualizar marcadores en el mapa cuando cambian las tiendas
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Limpiar marcadores viejos
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    stores.forEach((store) => {
      const isSelected = selectedStore?.id === store.id;

      // Icono HTML personalizado con SUCURSAL.png e interacción hover
      const customIcon = L.divIcon({
        className: 'custom-leaflet-store-wrapper',
        html: `
          <div class="store-map-marker ${isSelected ? 'active-selected' : ''}" data-store-id="${store.id}">
            <img src="/images/SUCURSAL.png" class="store-marker-image" alt="${store.name}" />
            <div class="store-marker-label">${store.name}</div>
          </div>
        `,
        iconSize: [60, 68],
        iconAnchor: [30, 60],
        popupAnchor: [0, -60],
      });

      const marker = L.marker([store.lat, store.lng], { icon: customIcon });

      // Evento Click en la sucursal del mapa
      marker.on('click', () => {
        onSelectStore(store);
        map.flyTo([store.lat, store.lng], 16, { duration: 1.2 });
      });

      marker.addTo(map);
      markersRef.current.set(store.id, marker);
    });
  }, [stores, selectedStore, onSelectStore]);

  // Si cambia la tienda seleccionada externamente, centrar el mapa
  useEffect(() => {
    if (!selectedStore || !mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo([selectedStore.lat, selectedStore.lng], 16, { duration: 1 });
  }, [selectedStore]);

  // Soporte de Voz (Web Speech API)
  const toggleVoiceSearch = () => {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Tu navegador no soporta reconocimiento de voz nativo. Puedes escribir tu consulta en el buscador.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-MX';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setSearchQuery(transcript);
      setIsDropdownOpen(true);
      setIsListening(false);

      // Si parece una pregunta para la IA, sugerir o abrir chat
      if (
        transcript.toLowerCase().includes('inventario') ||
        transcript.toLowerCase().includes('merma') ||
        transcript.toLowerCase().includes('ventas') ||
        transcript.toLowerCase().includes('quién') ||
        transcript.toLowerCase().includes('cuál')
      ) {
        onAskGemini(transcript);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleSelectSearchResult = (store) => {
    onSelectStore(store);
    setSearchQuery(store.name);
    setIsDropdownOpen(false);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([store.lat, store.lng], 16.5, { duration: 1.2 });
    }
  };

  const handleTriggerAI = (text) => {
    setIsDropdownOpen(false);
    onAskGemini(text || searchQuery);
  };

  return (
    <div className="dashboard-container">
      {/* MAPA PRINCIPAL LEAFLET STADIA */}
      <div ref={mapContainerRef} className="leaflet-map-canvas" />

      {/* 1. BRAND LOGO FLOTANTE (SUPERIOR IZQUIERDA) */}
      <div className="brand-floating-pill">
        <img src="/images/LOGO.png" alt="Otzo Logo" className="brand-logo-img" />
        <div className="brand-text-block">
          <div className="brand-title">
            ANALIZALO IA!
          </div>
          <div className="brand-subtitle">
            <span className="brand-status-dot" /> Red Activa ({stores.length} Sucursales)
          </div>
        </div>
      </div>

      {/* 2. BARRA DE BÚSQUEDA HÍBRIDA & VOZ (SUPERIOR CENTRADA) */}
      <div className="top-search-wrapper">
        <div className="search-bar-pill">
          {/* Icono de Lupa */}
          <svg
            className="search-icon-svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>

          {/* Campo de búsqueda */}
          <input
            type="text"
            className="search-input-field"
            placeholder="Buscar sucursal (ej. Chespi, Oswi) o preguntar a Gemini..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsDropdownOpen(true);
            }}
            onFocus={() => setIsDropdownOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchQuery.trim()) {
                if (filteredStores.length === 1) {
                  handleSelectSearchResult(filteredStores[0]);
                } else {
                  handleTriggerAI(searchQuery);
                }
              }
            }}
          />

          {searchQuery && (
            <button
              className="clear-search-btn"
              onClick={() => {
                setSearchQuery('');
                setIsDropdownOpen(false);
              }}
              title="Borrar"
            >
              ✕
            </button>
          )}

          {/* Botón de Voz / Micrófono */}
          <button
            className={`voice-btn-action ${isListening ? 'listening' : ''}`}
            onClick={toggleVoiceSearch}
            title={isListening ? 'Escuchando... Di tu consulta' : 'Comunicación por voz'}
          >
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </button>
        </div>

        {/* Dropdown interactivo de resultados */}
        {isDropdownOpen && searchQuery.trim() && (
          <div className="search-dropdown-menu">
            {filteredStores.length > 0 && (
              <>
                <div className="search-dropdown-section-title">Sucursales encontradas</div>
                {filteredStores.map((store) => (
                  <div
                    key={store.id}
                    className="search-item-row"
                    onClick={() => handleSelectSearchResult(store)}
                  >
                    <div className="search-item-left">
                      <img src="/images/SUCURSAL.png" width="24" height="24" alt="Pin" />
                      <div>
                        <div className="search-item-name">{store.name}</div>
                        <div className="search-item-sub">{store.address}</div>
                      </div>
                    </div>
                    <span
                      className={`panel-store-metric ${store.status === 'top'
                          ? 'metric-green'
                          : store.status === 'low'
                            ? 'metric-red'
                            : ''
                        }`}
                    >
                      {store.salesFormatted}
                    </span>
                  </div>
                ))}
              </>
            )}

            {/* Opción para enviar a Gemini */}
            <div
              className="search-ai-action-row"
              onClick={() => handleTriggerAI(searchQuery)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span>Preguntar a Gemini: &quot;{searchQuery}&quot;</span>
            </div>
          </div>
        )}
      </div>

      {/* 3. PANELES FLOTANTES IZQUIERDOS (MEJORES / PEORES VENTAS - BOSQUEJO) */}
      <div className="floating-side-panels">
        {/* Tarjeta 1: Mejores Ventas */}
        <div className="floating-panel-card">
          <div className="panel-card-header">
            <div className="panel-badge-icon panel-badge-green">▲</div>
            <div className="panel-card-title">Mejores Ventas</div>
          </div>
          <div className="panel-store-list">
            {topStores.map((store) => (
              <div
                key={store.id}
                className="panel-store-item"
                onClick={() => {
                  onSelectStore(store);
                  mapInstanceRef.current?.flyTo([store.lat, store.lng], 16, { duration: 1 });
                }}
                title="Ver sucursal"
              >
                <div className="panel-store-bullet-title">
                  <span className="panel-store-dot" style={{ background: '#10b981' }} />
                  {store.name}
                </div>
                <span className="panel-store-metric metric-green">+{store.variationPct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tarjeta 2: Peores Ventas */}
        <div className="floating-panel-card">
          <div className="panel-card-header">
            <div className="panel-badge-icon panel-badge-red">▼</div>
            <div className="panel-card-title">Peores Ventas</div>
          </div>
          <div className="panel-store-list">
            {lowStores.map((store) => (
              <div
                key={store.id}
                className="panel-store-item"
                onClick={() => {
                  onSelectStore(store);
                  mapInstanceRef.current?.flyTo([store.lat, store.lng], 16, { duration: 1 });
                }}
                title="Ver sucursal"
              >
                <div className="panel-store-bullet-title">
                  <span className="panel-store-dot" style={{ background: '#ef4444' }} />
                  {store.name}
                </div>
                <span className="panel-store-metric metric-red">{store.variationPct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. BOTÓN FLOTANTE "+" (AGREGAR TIENDAS - BOSQUEJO) */}
      <button
        className="fab-add-store-btn"
        onClick={onOpenAddStore}
        aria-label="Agregar tiendas"
        title="Agregar tiendas (Expansión de Red)"
      >
        <svg
          className="fab-icon-svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>
  );
}
