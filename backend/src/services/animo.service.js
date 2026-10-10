// Estado de ánimo del avatar según el rendimiento de la tienda.
//
// Puntaje 0–100 con tres factores (calibrados con el rango real de las 38 tiendas):
//   ventas     45 %  variación de la venta vs. el periodo anterior   (−15 % → 0 · +15 % → 100)
//   merma      30 %  % de lo disponible que se tiró por caducidad    (≤10 % → 100 · ≥50 % → 0)
//   faltantes  25 %  % de productos sin stock o bajos al cierre      (≤10 % → 100 · ≥45 % → 0)
//
// Solo dos estados: feliz (puntaje ≥ 50) o triste (< 50). Una tienda sin operación sale triste.

const UMBRAL_FELIZ = 50;

const escala = (valor, cero, cien) => {
  if (valor == null || !Number.isFinite(Number(valor))) return null;
  const t = (Number(valor) - cero) / (cien - cero);
  return Math.round(Math.min(1, Math.max(0, t)) * 100);
};
const abs = (n) => Math.abs(Number(n));

/**
 * @param {object} r Resultado de resumenTienda (dashboard.service)
 */
export function calcularAnimo(r) {
  if (r.tienda?.cerrada) {
    return {
      estado: "triste", puntaje: null, cerrada: true,
      mensaje: "Esta tienda no está operando en este periodo.", principal_problema: null, factores: [],
    };
  }

  const ventas = r.estadisticas?.venta_total?.variacion_pct ?? null;
  const merma = r.estadisticas?.merma_pct?.valor ?? null;
  const inv = r.inventario ?? {};
  const faltantes = inv.total_productos ? Math.round((1000 * inv.bajos) / inv.total_productos) / 10 : null;

  const factores = [
    {
      clave: "ventas", peso: 45, valor: ventas, puntaje: escala(ventas, -15, 15),
      texto: ventas == null ? "Sin comparación de ventas" : `Ventas ${ventas > 0 ? "+" : ""}${ventas} % vs. la semana anterior`,
      bien: `las ventas subieron ${abs(ventas)} % vs. la semana pasada`,
      mal: `las ventas bajaron ${abs(ventas)} % vs. la semana pasada`,
    },
    {
      clave: "merma", peso: 30, valor: merma, puntaje: escala(merma, 50, 10),
      texto: merma == null ? "Sin datos de merma" : `Se tiró el ${merma} % por caducidad`,
      bien: `casi no se tira producto (${merma} % de merma)`,
      mal: `se está tirando el ${merma} % del producto por caducidad`,
    },
    {
      clave: "faltantes", peso: 25, valor: faltantes, puntaje: escala(faltantes, 45, 10),
      texto: faltantes == null ? "Sin datos de inventario" : `${inv.bajos} de ${inv.total_productos} productos sin stock o bajos`,
      bien: "casi no hay productos agotados",
      mal: `hay ${inv.bajos} de ${inv.total_productos} productos sin stock o bajos`,
    },
  ];

  // Promedio ponderado solo con los factores que sí tienen dato
  const conDato = factores.filter((f) => f.puntaje != null);
  const pesoTotal = conDato.reduce((s, f) => s + f.peso, 0);
  const puntaje = pesoTotal ? Math.round(conDato.reduce((s, f) => s + f.puntaje * f.peso, 0) / pesoTotal) : 50;
  const estado = puntaje >= UMBRAL_FELIZ ? "feliz" : "triste";

  const ordenados = [...conDato].sort((a, b) => a.puntaje - b.puntaje);
  const peor = ordenados[0];
  const mejor = ordenados.at(-1);
  const hayProblema = peor && peor.puntaje < 50;

  let mensaje;
  if (!peor) mensaje = "Aún no hay datos suficientes de esta tienda.";
  else if (estado === "feliz") mensaje = `¡Vamos bien! ${capital(mejor.bien)}.` + (hayProblema ? ` Ojo: ${peor.mal}.` : "");
  else mensaje = `Semana difícil: ${peor.mal}. Revisa las recomendaciones.`;

  return {
    estado,
    puntaje,
    cerrada: false,
    mensaje,
    principal_problema: hayProblema ? peor.clave : null,
    factores: factores.map(({ bien, mal, ...f }) => f),
  };
}

const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1);
