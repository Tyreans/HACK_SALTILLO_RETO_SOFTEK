import ExcelJS from "exceljs";

const AZUL = "FF1F4E79";
const ROJO = { color: { argb: "FFC00000" }, bold: true };
const NARANJA = { color: { argb: "FFC55A11" }, bold: true };
const DINERO = '"$"#,##0.00';

function estiloEncabezado(hoja, columnas) {
  const fila = hoja.getRow(1);
  fila.font = { bold: true, color: { argb: "FFFFFFFF" } };
  fila.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AZUL } };
  hoja.views = [{ state: "frozen", ySplit: 1 }];
  hoja.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columnas } };
}

function filaTotales(hoja, claves, etiqueta = { columna: "producto", texto: "TOTAL" }) {
  const ultima = hoja.rowCount;
  const total = hoja.addRow({ [etiqueta.columna]: etiqueta.texto });
  for (const key of claves) {
    const letra = hoja.getColumn(key).letter;
    total.getCell(key).value = { formula: `SUM(${letra}2:${letra}${ultima})` };
  }
  total.font = { bold: true };
}

// Libro con el inventario de un día + hoja de resumen por tienda
export async function libroInventario({ fecha, filas, resumen }) {
  const libro = new ExcelJS.Workbook();
  libro.creator = "Otzo – Tienda Inteligente";
  libro.created = new Date();

  // --- Hoja 1: detalle
  const hoja = libro.addWorksheet(`Inventario ${fecha}`);
  hoja.columns = [
    { header: "Fecha", key: "fecha", width: 12 },
    { header: "Tienda", key: "tienda", width: 9 },
    { header: "Sitio", key: "sitio", width: 30 },
    { header: "SKU", key: "sku", width: 13 },
    { header: "Producto", key: "producto", width: 36 },
    { header: "Categoría", key: "categoria", width: 18 },
    { header: "Inicial", key: "inicial", width: 9 },
    { header: "Recibido", key: "recibido", width: 10 },
    { header: "Vendidos", key: "vendidos", width: 10 },
    { header: "Caducado", key: "caducado", width: 10 },
    { header: "Dañado", key: "danado", width: 9 },
    { header: "Cierre", key: "cierre", width: 9 },
    { header: "En camino", key: "en_camino", width: 10 },
    { header: "Horas sin stock", key: "horas_sin_stock", width: 15 },
    { header: "Valor inventario (USD)", key: "valor_inventario", width: 20, style: { numFmt: DINERO } },
  ];
  hoja.addRows(filas);
  estiloEncabezado(hoja, hoja.columns.length);
  hoja.eachRow((fila, n) => {
    if (n === 1) return;
    if (fila.getCell("horas_sin_stock").value > 0) fila.getCell("horas_sin_stock").font = ROJO;
    if (fila.getCell("cierre").value === 0) fila.getCell("cierre").font = ROJO;
    if (fila.getCell("caducado").value > 0) fila.getCell("caducado").font = NARANJA;
  });
  filaTotales(hoja, ["vendidos", "caducado", "danado", "cierre", "valor_inventario"]);

  // --- Hoja 2: resumen por tienda en ese día
  if (resumen?.length) {
    const r = libro.addWorksheet("Resumen por tienda");
    r.columns = [
      { header: "Tienda", key: "tienda", width: 9 },
      { header: "Nombre", key: "store_name", width: 34 },
      { header: "Sitio", key: "sitio", width: 30 },
      { header: "Vendidos", key: "vendidos", width: 10 },
      { header: "Caducado", key: "caducado", width: 10 },
      { header: "Dañado", key: "danado", width: 9 },
      { header: "% merma", key: "pct_merma", width: 10 },
      { header: "Horas sin stock", key: "horas_sin_stock", width: 15 },
      { header: "Productos con quiebre", key: "dias_producto_con_quiebre", width: 20 },
    ];
    r.addRows(resumen);
    estiloEncabezado(r, r.columns.length);
    filaTotales(r, ["vendidos", "caducado", "danado", "horas_sin_stock", "dias_producto_con_quiebre"], { columna: "store_name", texto: "TOTAL" });
  }

  return libro;
}
