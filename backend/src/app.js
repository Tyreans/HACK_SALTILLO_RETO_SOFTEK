import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { corsOptions } from "./config/cors.config.js";
import rutas from "./routes/index.js";
import { notFound, errorHandler } from "./middlewares/error.middleware.js";

const app = express();
const frontendPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../frontend/public"
);

app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));

app.use(express.static(frontendPath));
app.use("/api", rutas);

app.use(notFound);
app.use(errorHandler);

export default app;
