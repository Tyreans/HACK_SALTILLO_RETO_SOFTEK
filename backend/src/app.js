import express from "express";
import cors from "cors";
import { corsOptions } from "./config/cors.config.js";
import rutas from "./routes/index.js";
import { notFound, errorHandler } from "./middlewares/error.middleware.js";

const app = express();

app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));

app.use("/api", rutas);

app.use(notFound);
app.use(errorHandler);

export default app;
