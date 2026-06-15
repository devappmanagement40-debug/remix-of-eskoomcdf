import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes";
import { logger } from "./lib/logger";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use("/api", router);

// Serve pre-built React frontend in production
if (process.env.NODE_ENV === "production") {
  // Resolve from CWD so it works wherever the process is launched from (Plesk, Docker, etc.)
  const frontendDist =
    process.env.FRONTEND_DIST ||
    path.resolve(process.cwd(), "artifacts/eskom/dist/public");
  app.use(express.static(frontendDist));
  // SPA fallback — toutes les routes non-API servent index.html (Express 5 syntax)
  app.get("/{*path}", (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

export default app;
