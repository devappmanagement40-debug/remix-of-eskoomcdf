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
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Serve uploaded files
const uploadsDir = process.env.UPLOAD_DIR || path.resolve(process.cwd(), "public/uploads");
app.use("/uploads", express.static(uploadsDir));

// API routes
app.use("/api", router);

// JSON error handler — catches body-parser errors and unhandled route errors
// Always returns JSON instead of Express's default HTML error page
app.use((err: any, _req: any, res: any, next: any) => {
  if (res.headersSent) return next(err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal server error";
  return res.status(status).json({ error: message });
});

// Serve pre-built React frontend in production
if (process.env.NODE_ENV === "production") {
  const frontendDist =
    process.env.FRONTEND_DIST ||
    path.resolve(process.cwd(), "dist/public");
  app.use(express.static(frontendDist));
  app.get("/{*path}", (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

export default app;
