import * as Dashboard from "../models/dashboard.model.js";
import * as Tienda from "../models/tienda.model.js";
import * as Venta from "../models/venta.model.js";
import { ApiError } from "../utils/apiError.js";

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

  return {
    tienda: { store_id: t.store_id, nombre: t.store_name, sitio: t.site_name, region: t.region },
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
}
