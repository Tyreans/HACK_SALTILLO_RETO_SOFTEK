// Servicio para interactuar con la API REST de Express (/api) con soporte de fallbacks robustos

const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_API_BASE_URL)
  || 'http://localhost:3002/api';

// Cache o datos iniciales mock enriquecidos basados en los bosquejos
export const fallbackStoreDetails = {
  S001: {
    mejores_ventas: {
      total: '$12.4k',
      unidades: 248,
      variacion: '+18%',
      productos: [
        { rank: 1, name: 'Café espresso', amount: '$4.8k', sku: 'SKU-COF-01', unidades: 96 },
        { rank: 2, name: 'Tostada de aguacate', amount: '$3.9k', sku: 'SKU-BK-02', unidades: 82 },
        { rank: 3, name: 'Batido de plátano', amount: '$3.7k', sku: 'SKU-BEV-03', unidades: 70 },
      ],
    },
    peores_ventas: {
      total: '$1.8k',
      unidades: 36,
      variacion: '-12%',
      productos: [
        { rank: 1, name: 'Té de jazmín', amount: '$640', sku: 'SKU-TEA-04', unidades: 14 },
        { rank: 2, name: 'Pan de centeno', amount: '$560', sku: 'SKU-BK-05', unidades: 12 },
        { rank: 3, name: 'Chía con leche', amount: '$600', sku: 'SKU-BEV-06', unidades: 10 },
      ],
    },
    estadisticas: {
      ticket_promedio: '$24.50',
      conversion_pct: '3.8%',
      retencion_pct: '28%',
      margen_neto: '18%',
      merma_pct: '2.1%',
      tickets_totales: 1420,
    },
    inventario_badge: {
      bajos: 2,
      total_items: 48,
    },
    avatar_state: 'good', // 'good' | 'bad'
  },
  S003: {
    mejores_ventas: {
      total: '$4.2k',
      unidades: 85,
      variacion: '-14%',
      productos: [
        { rank: 1, name: 'Refresco Cola 600ml', amount: '$1.9k', sku: 'SKU-BEV-10', unidades: 75 },
        { rank: 2, name: 'Agua Purificada 1L', amount: '$1.3k', sku: 'SKU-WAT-11', unidades: 65 },
        { rank: 3, name: 'Papas Saladas 150g', amount: '$1.0k', sku: 'SKU-SNK-12', unidades: 40 },
      ],
    },
    peores_ventas: {
      total: '$850',
      unidades: 18,
      variacion: '-28%',
      productos: [
        { rank: 1, name: 'Yogurt Griego Fresa', amount: '$310', sku: 'SKU-DRY-14', unidades: 8 },
        { rank: 2, name: 'Sandwich de Pavo', amount: '$280', sku: 'SKU-SND-15', unidades: 6 },
        { rank: 3, name: 'Ensalada César', amount: '$260', sku: 'SKU-SAL-16', unidades: 4 },
      ],
    },
    estadisticas: {
      ticket_promedio: '$15.80',
      conversion_pct: '1.9%',
      retencion_pct: '14%',
      margen_neto: '8%',
      merma_pct: '6.4%',
      tickets_totales: 410,
    },
    inventario_badge: {
      bajos: 5,
      total_items: 42,
    },
    avatar_state: 'bad',
  },
};

// Inventario inicial basado en INVENTARIO_OPENED.png
export const initialInventoryItems = [
  {
    id: 1,
    sku: 'SKU-COF-01',
    name: 'Granos de café',
    presentation: '(Bolsa 1kg)',
    stock_actual: 42,
    stock_minimo: 50,
    precio_venta: '$18.00',
    ultimo_reabastecimiento: '05 Oct 2026',
    is_low: true,
    categoria: 'Abarrotes / Café',
  },
  {
    id: 2,
    sku: 'SKU-BK-02',
    name: 'Aguacates',
    presentation: 'KG',
    stock_actual: 12,
    stock_minimo: 20,
    precio_venta: '$4.50',
    ultimo_reabastecimiento: '08 Oct 2026',
    is_low: true,
    categoria: 'Frutas y Verduras',
  },
  {
    id: 3,
    sku: 'SKU-BEV-03',
    name: 'Batido de plátano',
    presentation: 'Botella 500ml',
    stock_actual: 15,
    stock_minimo: 25,
    precio_venta: '$3.50',
    ultimo_reabastecimiento: '09 Oct 2026',
    is_low: true,
    categoria: 'Bebidas Preparadas',
  },
  {
    id: 4,
    sku: 'SKU-TEA-04',
    name: 'Té de jazmín',
    presentation: 'Caja 20 sobres',
    stock_actual: 65,
    stock_minimo: 30,
    precio_venta: '$3.20',
    ultimo_reabastecimiento: '01 Oct 2026',
    is_low: false,
    categoria: 'Infusiones',
  },
  {
    id: 5,
    sku: 'SKU-BK-05',
    name: 'Pan de centeno',
    presentation: 'Pieza artesanal',
    stock_actual: 18,
    stock_minimo: 15,
    precio_venta: '$2.50',
    ultimo_reabastecimiento: '09 Oct 2026',
    is_low: false,
    categoria: 'Panadería',
  },
  {
    id: 6,
    sku: 'SKU-BEV-06',
    name: 'Chía con leche',
    presentation: 'Frasco 250ml',
    stock_actual: 32,
    stock_minimo: 20,
    precio_venta: '$3.80',
    ultimo_reabastecimiento: '07 Oct 2026',
    is_low: false,
    categoria: 'Desayunos',
  },
];

// Recomendaciones iniciales basadas en PANEL_PER_SUCURSAL.png y popups
export const initialRecommendations = [
  {
    id: 101,
    store_id: 'S001',
    tipo: 'reposicion',
    prioridad: 'alta',
    sku: 'SKU-COF-01',
    producto: 'Café espresso',
    name: 'Café espresso (Grano 1kg)',
    descripcion: 'Reponer café espresso y aguacates antes del fin de semana.',
    razon_ia: 'Se proyecta aumento de 35% en flujo de clientes matutinos este fin de semana. El inventario actual no resistirá el sábado.',
    emoji: '☕',
    stockActual: 12,
    stockSugerido: 38,
    stockObjetivo: 50,
    cantidadDeseada: 38,
    fechaProgramada: '14 oct 2026',
    estado: 'pendiente',
    prioClass: 'alta',
    statusBadge: 'Bajo stock',
  },
  {
    id: 102,
    store_id: 'S001',
    tipo: 'promocion',
    prioridad: 'media',
    sku: 'SKU-TEA-04',
    producto: 'Combo Mañana (Té de jazmín + Pan de centeno)',
    name: 'Combo Mañana (Té de jazmín + Pan de centeno)',
    descripcion: 'Ofrecer descuento en té de jazmín y pan de centeno para impulsar rotación.',
    razon_ia: 'El Pan de centeno tiene vida útil de 3 días y el Té de jazmín tiene rotación lenta. El combo incrementa la conversión en 18%.',
    precioRegular: 5.70,
    precioPromo: 4.50,
    descuentoSugerido: 20,
    descuentoDeseado: 20,
    horario: '7:00 am – 11:00 am',
    emoji: '🥐',
    estado: 'pendiente',
    prioClass: 'promo',
    statusBadge: '20% OFF Sugerido',
  },
  {
    id: 103,
    store_id: 'S001',
    tipo: 'precio',
    prioridad: 'baja',
    sku: 'SKU-BEV-03',
    producto: 'Batido de plátano',
    name: 'Batido de plátano',
    descripcion: 'Revisar precio de batido de plátano para mantener margen sin perder competitividad.',
    razon_ia: 'Competencia en la misma manzana ofrece producto similar a $2.95. Ajustando a $2.90 ganamos cuota sin comprometer el margen.',
    precioActual: 3.50,
    precioSugerido: 2.90,
    precioDeseado: 2.90,
    rangoValido: '$2.50 – $4.00',
    emoji: '🍌',
    estado: 'pendiente',
    prioClass: 'precio',
    statusBadge: 'Precio sugerido disponible',
  },
];

// Función para normalizar recomendaciones de la API hacia la UI de UnifiedSuggestionModal
export function normalizeRecommendation(row) {
  const tipo = row.tipo || 'precio';
  const isPrice = tipo === 'precio';
  const isRep = tipo === 'reposicion';
  const isPromo = tipo === 'promocion';

  const precioActual = Number(row.precio_actual) || (row.propuesta_original?.precio_actual ? Number(row.propuesta_original.precio_actual) : 4.50);
  const precioSugerido = Number(row.precio_propuesto) || (row.propuesta_original?.precio_propuesto ? Number(row.propuesta_original.precio_propuesto) : precioActual);
  const descPct = Number(row.descuento_pct ?? row.propuesta_original?.descuento_pct) || (isPrice ? 20 : 0);

  // Rango de competencia si existe
  const minComp = row.competencia?.minimo ?? (precioActual * 0.85).toFixed(2);
  const maxComp = row.competencia?.promedio ? (row.competencia.promedio * 1.15).toFixed(2) : (precioActual * 1.25).toFixed(2);

  const emoji = isPrice ? '💲' : isRep ? '📦' : '🏷️';

  return {
    id: row.id,
    store_id: row.store_id,
    tipo: row.tipo,
    name: row.producto || row.sku,
    sku: row.sku,
    producto: row.producto,
    descripcion: row.descripcion,
    razon_ia: row.descripcion || 'Recomendación generada por el agente de inteligencia artificial',
    prioridad: row.prioridad || 'alta',
    prioClass: isPromo ? 'promo' : isPrice ? 'precio' : (row.prioridad || 'alta'),
    statusBadge: isPrice
      ? 'Precio sugerido disponible'
      : isRep
        ? 'Riesgo de quiebre'
        : `${descPct}% OFF Sugerido`,
    emoji,
    origen: row.origen || 'agente',
    estado: row.estado || 'pendiente',

    // Campos de Precio
    precioActual,
    precioSugerido,
    precioDeseado: precioSugerido,
    rangoValido: `$${Number(minComp).toFixed(2)} – $${Number(maxComp).toFixed(2)}`,
    competencia: row.competencia,

    // Campos de Reposición
    stockActual: row.propuesta_original?.existencia ?? null,
    stockSugerido: row.cantidad ?? null,
    cantidadDeseada: row.cantidad ?? null,
    stockObjetivo: row.propuesta_original?.sobrante_proyectado ?? null,
    fechaProgramada: null,

    // Campos de Promoción
    precioRegular: precioActual,
    precioPromo: Math.round(precioActual * (1 - descPct / 100) * 100) / 100,
    descuentoSugerido: descPct,
    descuentoDeseado: descPct,
    fechaInicio: row.fecha_inicio || '',
    fechaFin: row.fecha_fin || '',
    motivo: row.motivo || '',
  };
}

// =========================================================================
// FUNCIONES API CON CONEXIÓN EN VIVO A EXPRES (localhost:3002) + FALLBACK
// =========================================================================

/**
 * Obtiene la lista de tiendas de la API /api/tiendas
 */
export async function getStoresListApi() {
  try {
    const res = await fetch(`${API_BASE_URL}/tiendas`, { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const json = await res.json();
      const list = json.data || json.datos || [];
      if (Array.isArray(list) && list.length > 0) {
        return list;
      }
    }
  } catch (err) {
    console.warn('API /tiendas no disponible, usando fallback:', err.message);
  }
  return null;
}

/**
 * Obtiene el resumen del Dashboard para una tienda (GET /api/dashboard/:tienda)
 */
export async function getDashboardData(storeId) {
  try {
    const res = await fetch(`${API_BASE_URL}/dashboard/${storeId}?dias=7&limite=3`, {
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const json = await res.json();
      const raw = json.data || json.datos;
      if (raw && (raw.mejores_ventas || raw.estadisticas)) {
        return {
          tienda: raw.tienda,
          periodo: raw.periodo,
          mejores_ventas: {
            total: `$${Number(raw.mejores_ventas?.venta_total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            unidades: raw.mejores_ventas?.unidades || 0,
            variacion: raw.mejores_ventas?.variacion_pct != null
              ? `${raw.mejores_ventas.variacion_pct > 0 ? '+' : ''}${raw.mejores_ventas.variacion_pct}%`
              : '+0%',
            productos: (raw.mejores_ventas?.productos || []).map((p, idx) => ({
              rank: idx + 1,
              name: p.producto,
              sku: p.sku,
              amount: `$${Number(p.venta || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              unidades: p.unidades,
              variacion: p.variacion_pct != null ? `${p.variacion_pct > 0 ? '+' : ''}${p.variacion_pct}%` : null,
            })),
          },
          peores_ventas: {
            total: `$${Number(raw.peores_ventas?.venta_total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            unidades: raw.peores_ventas?.unidades || 0,
            variacion: raw.peores_ventas?.variacion_pct != null
              ? `${raw.peores_ventas.variacion_pct > 0 ? '+' : ''}${raw.peores_ventas.variacion_pct}%`
              : '-0%',
            productos: (raw.peores_ventas?.productos || []).map((p, idx) => ({
              rank: idx + 1,
              name: p.producto,
              sku: p.sku,
              amount: `$${Number(p.venta || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              unidades: p.unidades,
              variacion: p.variacion_pct != null ? `${p.variacion_pct > 0 ? '+' : ''}${p.variacion_pct}%` : null,
            })),
          },
          estadisticas: {
            ticket_promedio: raw.estadisticas?.ticket_promedio?.valor != null ? `$${raw.estadisticas.ticket_promedio.valor.toFixed(2)}` : '$24.50',
            conversion_pct: raw.estadisticas?.conversion_pct?.valor != null ? `${raw.estadisticas.conversion_pct.valor}%` : '3.8%',
            // Retención dinámica por tienda derivada de conversión y margen (dataset no incluye IDs de clientes)
            retencion_pct: raw.estadisticas?.conversion_pct?.valor != null
              ? `${Math.min(48, Math.max(12, Math.round((Number(raw.estadisticas.conversion_pct.valor) || 0) * 1.75 + (Number(raw.estadisticas.margen_pct?.valor) || 50) * 0.12)))}%`
              : '24%',
            margen_neto: raw.estadisticas?.margen_pct?.valor != null ? `${raw.estadisticas.margen_pct.valor}%` : '18%',
            merma_pct: raw.estadisticas?.merma_pct?.valor != null ? `${raw.estadisticas.merma_pct.valor}%` : '2.1%',
            tickets_totales: 1420,
          },
          inventario_badge: {
            bajos: raw.inventario?.bajos ?? 2,
            total_items: raw.inventario?.total_productos ?? 48,
          },
          avatar_state: (raw.estadisticas?.venta_total?.variacion_pct == null || raw.estadisticas.venta_total.variacion_pct >= 0)
            ? 'good'
            : 'bad',
        };
      }
    }
  } catch (err) {
    console.warn(`API /dashboard/${storeId} no disponible, usando fallback:`, err.message);
  }
  return fallbackStoreDetails[storeId] || fallbackStoreDetails.S001;
}

/**
 * Obtiene el inventario operativo de la sucursal (GET /api/inventario?tienda=...)
 */
export async function getStoreInventory(storeId) {
  try {
    const res = await fetch(`${API_BASE_URL}/inventario?tienda=${storeId}`, {
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const json = await res.json();
      const list = json.data || json.datos;
      if (Array.isArray(list) && list.length > 0) {
        return list.map((row, idx) => ({
          id: idx + 1,
          sku: row.sku,
          name: row.producto,
          presentation: row.categoria || 'Unidad',
          stock_actual: row.cierre ?? 0,
          stock_minimo: 15,
          precio_venta: row.valor_inventario && row.cierre
            ? `$${(row.valor_inventario / row.cierre).toFixed(2)}`
            : '$3.50',
          ultimo_reabastecimiento: row.fecha || '30 Sep 2026',
          is_low: (row.cierre ?? 0) <= 5 || (row.horas_sin_stock ?? 0) > 0 || (row.caducado ?? 0) > 0,
          categoria: row.categoria || 'General',
          caducado: row.caducado || 0,
          danado: row.danado || 0,
          horas_sin_stock: row.horas_sin_stock || 0,
        }));
      }
    }
  } catch (err) {
    console.warn(`API /inventario?tienda=${storeId} no disponible:`, err.message);
  }
  return initialInventoryItems;
}

/**
 * Descargar reporte Excel generado por la API de backend (/api/inventario/export?tienda=...)
 */
export async function downloadInventoryExcel(storeId) {
  try {
    const res = await fetch(`${API_BASE_URL}/inventario/export?tienda=${storeId}`);
    if (!res.ok) throw new Error('Error al descargar archivo');
    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename="?([^"]+)"?/);
    const filename = match ? match[1] : `inventario_${storeId}.xlsx`;

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error('Error al descargar Excel de inventario:', err);
    return false;
  }
}

/**
 * Obtiene recomendaciones de la IA para una sucursal (GET /api/recomendaciones/:tienda?tipo=...)
 */
export async function getStoreRecommendations(storeId, tipo = null) {
  try {
    const url = tipo
      ? `${API_BASE_URL}/recomendaciones/${storeId}?tipo=${tipo}`
      : `${API_BASE_URL}/recomendaciones/${storeId}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const json = await res.json();
      const list = json.data || json.datos;
      if (Array.isArray(list) && (list.length > 0 || tipo !== 'precio')) {
        return list.map(normalizeRecommendation);
      }
    }
    if (tipo === 'reposicion' || tipo === 'promocion') {
      throw new Error(`API /recomendaciones/${storeId} respondió ${res.status}`);
    }
  } catch (err) {
    console.warn(`API /recomendaciones/${storeId} no disponible:`, err.message);
    if (tipo === 'reposicion' || tipo === 'promocion') throw err;
  }
  return initialRecommendations.filter((r) => r.tipo === 'precio' && (!tipo || r.tipo === tipo));
}

/**
 * Crea una sugerencia manual por el gerente (POST /api/recomendaciones)
 */
export async function createRecommendationApi(payload) {
  try {
    const res = await fetch(`${API_BASE_URL}/recomendaciones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.success !== false) {
      const created = json.data || json.datos || json;
      return { ok: true, data: normalizeRecommendation(created) };
    }
    return { ok: false, error: json.error?.message || `Error ${res.status}` };
  } catch (err) {
    console.warn('API POST /recomendaciones falló:', err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * Acepta una recomendación (POST /api/recomendaciones/:id/aceptar)
 * Verifica estrictamente la respuesta del servidor antes de indicar éxito.
 */
export async function acceptRecommendationApi(id, payload = {}) {
  try {
    // Solo enviar el campo exacto permitido para evitar error 400
    const cleanPayload = {};
    if (payload.cantidad != null) cleanPayload.cantidad = Number(payload.cantidad);
    if (payload.descuento_pct != null) cleanPayload.descuento_pct = Number(payload.descuento_pct);
    if (payload.precio != null) cleanPayload.precio = Number(payload.precio);
    if (payload.fecha_inicio) cleanPayload.fecha_inicio = payload.fecha_inicio;
    if (payload.fecha_fin) cleanPayload.fecha_fin = payload.fecha_fin;

    const res = await fetch(`${API_BASE_URL}/recomendaciones/${id}/aceptar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleanPayload),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.success !== false) {
      return { ok: true, data: json.data };
    }
    return { ok: false, error: json.error?.message || `Error ${res.status}: no se pudo aceptar la recomendación` };
  } catch (err) {
    console.error(`Error al aceptar recomendación ${id}:`, err);
    return { ok: false, error: err.message || 'Error de conexión con el servidor' };
  }
}

/**
 * Rechaza una recomendación (POST /api/recomendaciones/:id/rechazar)
 * Verifica estrictamente la respuesta del servidor antes de indicar éxito.
 */
export async function rejectRecommendationApi(id, motivo = '') {
  try {
    const res = await fetch(`${API_BASE_URL}/recomendaciones/${id}/rechazar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ motivo: motivo || null }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.success !== false) {
      return { ok: true, data: json.data };
    }
    return { ok: false, error: json.error?.message || `Error ${res.status}: no se pudo rechazar la recomendación` };
  } catch (err) {
    console.error(`Error al rechazar recomendación ${id}:`, err);
    return { ok: false, error: err.message || 'Error de conexión con el servidor' };
  }
}

/**
 * Edita una recomendación (PATCH /api/recomendaciones/:id)
 */
export async function updateRecommendationApi(id, payload = {}) {
  try {
    const res = await fetch(`${API_BASE_URL}/recomendaciones/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.success !== false) {
      return { ok: true, data: json.data };
    }
    return { ok: false, error: json.error?.message || `Error ${res.status}: no se pudo editar la recomendación` };
  } catch (err) {
    console.error(`Error al editar recomendación ${id}:`, err);
    return { ok: false, error: err.message || 'Error de conexión con el servidor' };
  }
}
