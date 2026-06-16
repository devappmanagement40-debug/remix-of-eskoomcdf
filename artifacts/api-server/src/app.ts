import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes";
import { logger } from "./lib/logger";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app: Express = express();

// Trust Plesk / Nginx / Apache reverse proxy so Express sees the real client IP
// and req.protocol is correct (https) for cookie security, rate-limiting, etc.
app.set("trust proxy", 1);

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
app.use(cors({
  origin: [
    "https://geenergy.top",
    "https://www.geenergy.top",
    /\.replit\.app$/,
    /\.replit\.dev$/,
    "http://localhost:5000",
    "http://localhost:5173",
  ],
  credentials: true,
}));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// API routes
app.use("/api", router);

// Serve locally uploaded files (replaces Supabase Storage)
const uploadsDir = process.env.UPLOAD_DIR || path.resolve(process.cwd(), "public", "uploads");
app.use("/uploads", express.static(uploadsDir));

// Serve pre-built React frontend in production
if (process.env.NODE_ENV === "production") {
  // Always resolve dist/public relative to the repo root (process.cwd()).
  // This works for both build strategies:
  //   - root build.mjs  → cwd = repo root → dist/public ✅
  //   - Plesk startup   → cwd = repo root → dist/public ✅
  const frontendDist =
    process.env.FRONTEND_DIST ||
    path.resolve(process.cwd(), "dist/public");
  app.use(express.static(frontendDist));
  // SPA fallback — toutes les routes non-API servent index.html (Express 5 syntax)
  app.get("/{*path}", (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

export default app;
