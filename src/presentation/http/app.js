import express from "express";
import cors from "cors";
import { registerHealthRoute } from "./routes/health.js";
import { registerQrRoutes } from "./routes/qr.js";
import { registerSupportRoute } from "./routes/support.js";

export function createApp({ qrProvider }) {
  const app = express();

  const corsOrigin = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((value) => value.trim())
    : "*";

  const corsOptions = {
    origin: corsOrigin,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false
  };

  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions));
  app.use(express.json());

  registerHealthRoute(app, { model: "bot" });
  registerQrRoutes(app, qrProvider);
  registerSupportRoute(app);

  app.get("/ping", (_req, res) => {
    res.json({ ok: true, ts: new Date().toISOString() });
  });

  return app;
}
