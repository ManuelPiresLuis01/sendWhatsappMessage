import express from "express";
import { registerHealthRoute } from "./routes/health.js";
import { registerQrRoutes } from "./routes/qr.js";

export function createApp({ qrProvider }) {
  const app = express();

  registerHealthRoute(app, { model: "bot" });
  registerQrRoutes(app, qrProvider);

  app.get("/ping", (_req, res) => {
    res.json({ ok: true, ts: new Date().toISOString() });
  });

  return app;
}
