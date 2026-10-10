import { Router } from "express";
import { query } from "../config/db.config.js";
import * as Tiendas from "../controllers/tienda.controller.js";
import * as Productos from "../controllers/producto.controller.js";
import * as Inventario from "../controllers/inventario.controller.js";
import * as Ventas from "../controllers/venta.controller.js";
import * as Dashboard from "../controllers/dashboard.controller.js";
import chatRoutes from "./chat.routes.js";
import { asyncHandler, ok } from "../utils/apiResponse.js";

const router = Router();

router.get("/", (req, res) =>
  ok(res, {
    nombre: "API Otzo",
    endpoints: router.stack
      .filter((c) => c.route)
      .map((c) => `${Object.keys(c.route.methods)[0].toUpperCase()} /api${c.route.path}`),
  })
);

router.get("/health", asyncHandler(async (req, res) => {
  await query("SELECT 1");
  ok(res, { status: "ok", db: "conectada" });
}));

// Dashboard (panel izquierdo: mejores, peores, estadísticas, inventario)
router.get("/dashboard/:tienda", Dashboard.resumen);

// Chat
router.use("/chat", chatRoutes);

// Tiendas
router.get("/tiendas", Tiendas.listar);
router.get("/tiendas/:id", Tiendas.obtener);
router.get("/tiendas/:id/kpis", Tiendas.kpis);

// Productos
router.get("/productos", Productos.listar);
router.get("/productos/categorias", Productos.categorias);
router.get("/productos/:sku", Productos.obtener);

// Inventario
router.get("/inventario", Inventario.delDia);
router.get("/inventario/resumen", Inventario.resumen);
router.get("/inventario/export", Inventario.exportarExcel);

// Ventas y promociones
router.get("/ventas/diarias", Ventas.diarias);
router.get("/ventas/top-productos", Ventas.topProductos);
router.get("/promociones", Ventas.promociones);

export default router;
