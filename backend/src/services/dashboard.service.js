import * as Dashboard from "../models/dashboard.model.js";
import * as Tienda from "../models/tienda.model.js";
import * as Venta from "../models/venta.model.js";
import { ApiError } from "../utils/apiError.js";
import { calcularAnimo } from "./animo.service.js";

const sumarDias = (fecha, dias) => {
  const d = new Date(fecha + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
};
const redondear = (n, d = 1) => (n == null ? null : Math.round(n * 10 ** d) / 10 ** d);
const variacion = (actual, previo) => (actual == null || !previo ? null : redondear((100 * (actual - previo)) / previo));

// Periodo = últimos `dias` días que terminan en `hasta`; se compara contra los `dias` previos.
export async function periodo({ hasta, dias }) {
  hasta = hasta || (await Venta.rangoFechas()).hasta;
  const desde = sumarDias(hasta, -(dias - 1));
  return { desde, hasta, dias, prevDesde: sumarDias(desde, -dias), prevHasta: sumarDias(desde, -1) };
}

function bloqueVentas(productos) {
  const venta = productos.reduce((s, p) => s + p.venta, 0);
  const previo = productos.reduce((s, p) => s + p.venta_periodo_anterior, 0);
  return {
    venta_total: redondear(venta, 2),
    unidades: productos.reduce((s, p) => s + p.unidades, 0),
    variacion_pct: variacion(venta, previo),
    productos,
  };
}

export async function resumenTienda({ tienda, hasta, dias = 7, limite = 3 }) {
  const t = await Tienda.obtener(tienda);
  if (!t) throw new ApiError(404, `La tienda ${tienda} no existe`);
  const p = await periodo({ hasta, dias });

  const [mejores, peores, est, inventario] = await Promise.all([
    Dashboard.productosPorVenta({ tienda, ...p, limite, orden: "DESC" }),
    Dashboard.productosPorVenta({ tienda, ...p, limite, orden: "ASC" }),
    Dashboard.estadisticas({ tienda, ...p }),
    Dashboard.inventarioCobertura({ tienda, desde: p.desde, hasta: p.hasta }),
  ]);

  const a = est.actual ?? {};
  const b = est.anterior ?? {};
  const bajos = inventario.filter((i) => i.bajo);

  const resumen = {
    tienda: {
      store_id: t.store_id, nombre: t.store_name, sitio: t.site_name, region: t.region,
      // Cerrada si cerró definitivamente antes del periodo o no registró ventas en él
      cerrada: Boolean((t.closed_date && t.closed_date <= p.desde) || !(a.venta_total > 0)),
    },
    periodo: { desde: p.desde, hasta: p.hasta, dias, comparado_con: { desde: p.prevDesde, hasta: p.prevHasta } },
    mejores_ventas: bloqueVentas(mejores),
    peores_ventas: bloqueVentas(peores),
    estadisticas: {
      ticket_promedio: { valor: a.ticket_promedio, variacion_pct: variacion(a.ticket_promedio, b.ticket_promedio) },
      conversion_pct: { valor: a.conversion_pct, variacion_pct: variacion(a.conversion_pct, b.conversion_pct) },
      margen_pct: { valor: a.margen_pct, variacion_pct: variacion(a.margen_pct, b.margen_pct) },
      merma_pct: { valor: a.merma_pct, variacion_pct: variacion(a.merma_pct, b.merma_pct) },
      tickets_por_hora_personal: { valor: a.tickets_por_hora_personal, variacion_pct: variacion(a.tickets_por_hora_personal, b.tickets_por_hora_personal) },
      venta_total: { valor: a.venta_total, variacion_pct: variacion(a.venta_total, b.venta_total) },
    },
    inventario: {
      fecha: p.hasta,
      total_productos: inventario.length,
      bajos: bajos.length,
      // Para el cuadro: los más urgentes primero. La tabla completa sale de GET /api/inventario
      productos: inventario.slice(0, 5),
    },
  };
  // Estado de ánimo del avatar (feliz / triste)
  resumen.animo = calcularAnimo(resumen);
  return resumen;
}

// ---------------------------------------------------------------- avatar

export async function animoTienda({ tienda, hasta, dias = 7 }) {
  const r = await resumenTienda({ tienda, hasta, dias, limite: 1 });
  return { tienda: r.tienda, periodo: r.periodo, ...r.animo };
}

// Ánimo de todas las tiendas (para colorear el mapa). Se guarda 10 minutos en memoria
// porque calcula el dashboard de cada tienda.
const cacheTodas = new Map();
export async function animoTodas({ hasta, dias = 7 }) {
  const clave = `${hasta ?? "ultimo"}|${dias}`;
  const guardado = cacheTodas.get(clave);
  if (guardado && Date.now() - guardado.cuando < 10 * 60 * 1000) return guardado.datos;

  const tiendas = await Tienda.listar();
  const datos = [];
  for (let i = 0; i < tiendas.length; i += 5) { // de 5 en 5 para no saturar la base
    const lote = await Promise.all(tiendas.slice(i, i + 5).map(async (t) => {
      const a = await animoTienda({ tienda: t.store_id, hasta, dias });
      return { store_id: t.store_id, nombre: t.store_name, sitio: t.site_name, region: t.region,
        estado: a.estado, puntaje: a.puntaje, cerrada: a.cerrada, principal_problema: a.principal_problema };
    }));
    datos.push(...lote);
  }
  datos.sort((a, b) => a.puntaje - b.puntaje);
  cacheTodas.set(clave, { cuando: Date.now(), datos });
  return datos;
}
