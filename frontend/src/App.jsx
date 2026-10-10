import { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import RestockPopup from './components/RestockPopup';
import SuccessToast from './components/SuccessToast';
import { apiRequest } from './api';

const dateLabel = (date) => (date ? new Date(date).toLocaleDateString('es-MX') : '—');

function toProduct(recommendation) {
  const priority = {
    alta: 'Prioridad alta',
    media: 'Prioridad media',
    baja: 'Prioridad baja',
  };
  return {
    id: recommendation.id,
    name: recommendation.producto,
    category: `SKU: ${recommendation.sku}`,
    status: priority[recommendation.prioridad] || 'Pendiente',
    stock: recommendation.descripcion,
    date: dateLabel(recommendation.creada_en),
    tone: 'coffee',
    emoji: '📦',
    quantity: recommendation.cantidad ?? 0,
    action: recommendation.estado === 'aceptada'
      ? 'accepted'
      : recommendation.estado === 'rechazada'
        ? 'rejected'
        : 'idle',
  };
}

function App() {
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState('');
  const [products, setProducts] = useState([]);
  const [alert, setAlert] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(true);
  const requestNumber = useRef(0);

  const loadRecommendations = useCallback(async (storeId) => {
    const request = ++requestNumber.current;
    if (!storeId) return;
    try {
      const rows = await apiRequest(`/recomendaciones/${encodeURIComponent(storeId)}?tipo=reposicion`);
      if (request !== requestNumber.current) return;
      setError('');
      setProducts((rows || []).map(toProduct));
    } catch (err) {
      if (request === requestNumber.current) {
        setError(err.message);
        setProducts([]);
      }
    } finally {
      if (request === requestNumber.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let activo = true;
    apiRequest('/tiendas')
      .then((rows) => {
        if (!activo) return;
        setStores(rows || []);
        if (rows?.length) {
          const firstStore = rows[0].store_id;
          setSelectedStore(firstStore);
          setLoading(true);
          loadRecommendations(firstStore);
        }
      })
      .catch((err) => {
        if (activo) setError(err.message);
      });
    return () => {
      activo = false;
    };
  }, [loadRecommendations]);

  useEffect(() => {
    if (!alert) return undefined;
    const timer = window.setTimeout(() => setAlert(null), 2600);
    return () => window.clearTimeout(timer);
  }, [alert]);

  const handleQuantityChange = (id, delta) => {
    setProducts((current) => current.map((product) =>
      product.id === id && product.action === 'idle'
        ? { ...product, quantity: Math.max(1, (product.quantity ?? 0) + delta), action: 'editing' }
        : product
    ));
  };

  const handleStoreChange = (storeId) => {
    setProducts([]);
    setError('');
    setLoading(true);
    setSelectedStore(storeId);
    loadRecommendations(storeId);
  };

  const handleEdit = async (id) => {
    const product = products.find((item) => item.id === id);
    if (!product) return;
    setBusyId(id);
    setError('');
    try {
      await apiRequest(`/recomendaciones/${id}`, { method: 'PATCH', body: { cantidad: product.quantity } });
      setAlert({ type: 'success', message: `Cantidad guardada para ${product.name}.` });
      await loadRecommendations(selectedStore);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const accept = async (product) => {
    setBusyId(product.id);
    setError('');
    try {
      await apiRequest(`/recomendaciones/${product.id}/aceptar`, {
        method: 'POST',
        body: { cantidad: product.quantity },
      });
      setAlert({ type: 'success', message: `Orden de ${product.name} aceptada y exportada como JSON.` });
      await loadRecommendations(selectedStore);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const handleAccept = (id) => {
    const product = products.find((item) => item.id === id);
    if (product) return accept(product);
  };

  const handleReject = async (id) => {
    setBusyId(id);
    setError('');
    try {
      await apiRequest(`/recomendaciones/${id}/rechazar`, { method: 'POST', body: {} });
      setAlert({ type: 'success', message: 'Recomendación rechazada.' });
      await loadRecommendations(selectedStore);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirm = async (updatedProducts) => {
    const pendientes = updatedProducts.filter((product) => product.action !== 'accepted' && product.action !== 'rejected');
    let todasAceptadas = true;
    for (const product of pendientes) {
      if (!(await accept(product))) todasAceptadas = false;
    }
    if (pendientes.length && todasAceptadas) setIsModalOpen(false);
  };

  const handleClose = () => setIsModalOpen(false);

  return (
    <>
      {alert ? <SuccessToast message={alert.message} /> : null}
      {isModalOpen ? (
        <RestockPopup
          products={products}
          stores={stores}
          selectedStore={selectedStore}
          onStoreChange={handleStoreChange}
          onQuantityChange={handleQuantityChange}
          onEdit={handleEdit}
          onAccept={handleAccept}
          onReject={handleReject}
          onConfirm={handleConfirm}
          onClose={handleClose}
          onCancel={handleClose}
          isLoading={loading}
          busyId={busyId}
          error={error}
          description="Recomendaciones generadas con el historial de la tienda y el calendario disponible. Puedes ajustar cada cantidad antes de aceptar."
        />
      ) : (
        <main className="page-shell">
          <button className="confirm-button" type="button" onClick={() => setIsModalOpen(true)}>
            Abrir recomendaciones de reposición
          </button>
        </main>
      )}
    </>
  );
}

export default App;
