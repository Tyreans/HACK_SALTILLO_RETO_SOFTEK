import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { corsOptions } from "./config/cors.config.js";
import { openapi } from "./config/swagger.config.js";
import rutas from "./routes/index.js";
import { notFound, errorHandler } from "./middlewares/error.middleware.js";

const app = express();
app.set("trust proxy", 1);

app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));


app.get("/api/docs.json", (req, res) => res.json(openapi));
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: "API Otzo" }));

app.use("/api", rutas);

app.use(notFound);
app.use(errorHandler);

export default app;
