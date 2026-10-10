# Reporte de calidad de datos – Otzo

Generado por `backend/db/seeds/limpiar.js` el 2026-10-10 01:22.

## Correcciones aplicadas

| Tabla | Problema | Filas | Acción |
|---|---|---:|---|
| stores | Tienda S039 duplica a S004 (mismo sitio, nombre y apertura) | 1 | Eliminada (no tiene ventas ni inventario) |
| stores | Tienda S040 apunta a un sitio inexistente (ST99) | 1 | Eliminada (no tiene ventas ni inventario) |
| stores | Nombres con mayúsculas/espacios inconsistentes | 4 | Normalizados |
| stores | Horario de apertura vacío o '#N/A' | 5 | Dejado en NULL |
| products | Categorías escritas distinto (BAKERY, bakery, Bakery Goods…) | 19 | Unificadas a una sola forma |
| products | SKUs repetidos | 37 | Se conservó la fila más completa |
| products | Vida útil 0 o negativa | 5 | Dejada en NULL |
| products | Costo unitario vacío o en 0 | 184 | Dejado en NULL |
| products | Precio base en 0 | 144 | Dejado en NULL |
| products | Fecha de descontinuación anterior al lanzamiento | 121 | Se conserva; marcar al analizar |
| sales_daily | Filas duplicadas exactas | 3000 | Eliminadas |
| sales_daily | Fechas en otros formatos (MM/DD/YYYY, DD-Mon-YY) | 300 | Convertidas a YYYY-MM-DD |
| sales_daily | IDs de tienda mal escritos (s013, 'S007 ', S0032) | 143 | Normalizados a S### |
| sales_daily | SKUs mal escritos (minúsculas, espacios, sin guion) | 322 | Normalizados a SKU-###### |
| sales_daily | Unidades vacías | 100 | Calculadas como venta bruta / precio |
| sales_daily | Unidades que no cuadran con venta bruta / precio (p. ej. 10x) | 87 | Recalculadas |
| sales_daily | Precio unitario × unidades ≠ venta bruta | 578 | Precio recalculado como venta bruta / unidades |
| sales_daily | Venta neta ≠ bruta − descuento | 180 | Recalculada |
| sales_daily | Promoción inexistente (PR999) | 60 | Promo dejada en NULL |
| promotions | PR003 termina (2025-11-19) antes de empezar (2025-11-24) | 1 | Fin corregido a 2025-12-24 según las ventas |
| promotions | PR013 'Mystery Promo' no aparece en ninguna venta | 1 | Se conserva, sin efecto en ventas |
| inventory_daily | Filas duplicadas exactas | 500 | Eliminadas |
| inventory_daily | SKUs en minúsculas | 300 | Normalizados |
| inventory_daily | Cierre ≠ inicial + recibido − vendido − caducado − dañado | 2195 | Cierre recalculado con la fórmula |
| inventory_daily | Inventario de cierre negativo | 115 | Ajustado a 0 |
| inventory_daily | Más de 24 horas sin stock en un día | 60 | Limitado a 24 |
| purchase_orders | po_id repetido con cantidades distintas | 100 | Se conservó la fila coherente |
| purchase_orders | Proveedor inexistente (SUP99) | 50 | Reemplazado por el proveedor del producto |
| purchase_orders | Costo unitario vacío o negativo | 6579 | Tomado del catálogo de productos |
| purchase_orders | 'Delivered' sin fecha de recepción | 78 | Se usó la fecha esperada |
| purchase_orders | Recibida antes de ordenarse | 60 | Se usó la fecha esperada |
| purchase_orders | Recibido mayor a lo ordenado | 40 | Se conserva (posible sobre-entrega) |
| prices | Filas duplicadas exactas | 40 | Eliminadas |
| prices | Moneda escrita distinto (US$, usd, 'USD ') | 67 | Unificada a USD |
| prices | Fechas de vigencia en formato MM/DD/YYYY | 83 | Convertidas a YYYY-MM-DD |
| prices | Precios capturados en centavos (p. ej. 569 en vez de 5.69) | 13 | Divididos entre 100 |
| prices | Vigencia que termina antes de empezar | 57 | Fin dejado en NULL |
| product_barcodes | Código de barras asignado a más de un SKU | 15 | Se conservó el primero |
| store_daily_kpis | Filas duplicadas exactas | 25 | Eliminadas |
| store_daily_kpis | Horas de personal imposibles (-5, 999) | 22 | Dejadas en NULL |
| store_daily_kpis | Tránsito en 0 o menor que las transacciones | 70 | Dejado en NULL |
| store_daily_kpis | Tránsito vacío | 50 | Se queda en NULL |
| weather_daily | Filas duplicadas exactas | 20 | Eliminadas |
| weather_daily | Temperatura -999 (dato faltante) | 80 | Dejada en NULL |
| weather_daily | Mínima mayor que la máxima | 25 | Intercambiadas |
| weather_daily | Precipitación vacía | 60 | Se queda en NULL |
| products | SKUs que aparecen en ventas/inventario/precios pero no en el catálogo (p. ej. SKU-100040) | 480 | Agregados con en_catalogo = false para no perder ventas |

## Filas descartadas (detalle en `rechazos.csv`)

| Tabla | Motivo | Filas |
|---|---|---:|
| stores | tienda duplicada | 1 |
| stores | sitio inexistente | 1 |
| products | SKU duplicado | 37 |
| sales_daily | venta antes de la apertura | 120 |
| sales_daily | venta durante cierre temporal (Renovation) | 76 |
| sales_daily | unidades/ventas negativas | 150 |
| sales_daily | venta durante cierre temporal (Terminal works) | 53 |
| sales_daily | venta durante cierre temporal (Equipment failure) | 71 |
| purchase_orders | po_id repetido | 100 |
| prices | tienda inexistente | 39 |
| prices | precio inválido (TBD, ?, N/A, -1) | 73 |
| product_barcodes | código de barras repetido | 15 |
