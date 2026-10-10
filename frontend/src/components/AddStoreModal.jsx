import { useState } from 'react';
import './AddStoreModal.css';

export default function AddStoreModal({ onClose, onAddStore }) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [format, setFormat] = useState('Full Counter');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Crear nueva tienda placeholder en Saltillo
    const newStore = {
      id: `S${Date.now().toString().slice(-3)}`,
      name: name.trim(),
      city: 'Saltillo, COAH',
      address: address.trim() || 'Zona Centro · Saltillo',
      format,
      // Coordenadas con ligera variación aleatoria en el centro de Saltillo
      lat: 25.4248 + (Math.random() - 0.5) * 0.015,
      lng: -101.0035 + (Math.random() - 0.5) * 0.015,
      sales: 85000,
      salesFormatted: '$85.0k',
      variationPct: 5.0,
      status: 'normal',
      tickets: 750,
      marginPct: 70.0,
      mermaPct: 4.5,
      avatar: 'neutral',
      hours: '24 Horas',
    };

    onAddStore(newStore);
    onClose();
  };

  return (
    <div className="add-store-backdrop" onClick={onClose}>
      <div className="add-store-card" onClick={(e) => e.stopPropagation()}>
        <div className="add-store-header">
          <div>
            <div className="add-store-badge">Expansión de Red · Fase 2</div>
            <h2 className="add-store-title">➕ Registrar Nueva Sucursal</h2>
          </div>
          <button className="add-store-close-btn" onClick={onClose}>✕</button>
        </div>

        <p className="add-store-desc">
          Agrega una nueva sucursal a la red de Otzo. Se ubicará de forma automática con su pin en el mapa en tiempo real.
        </p>

        <form onSubmit={handleSubmit} className="add-store-form">
          <div className="form-group">
            <label className="form-label">Nombre de la Sucursal</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ej. Sucursal Ramos Arizpe, Sucursal Coss..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Dirección o Ubicación</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ej. Blvd. Venustiano Carranza #2300"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Formato de Tienda</label>
            <select
              className="form-select"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
            >
              <option value="Full Counter">Full Counter (24 Horas)</option>
              <option value="Express Kiosk">Express Kiosk (Paso rápido)</option>
              <option value="Shop-in-Shop">Shop-in-Shop (Concesión)</option>
            </select>
          </div>

          <div className="add-store-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-submit">
              Guardar y Ubicar en Mapa
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
