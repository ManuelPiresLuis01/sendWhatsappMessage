export function registerHealthRoute(app, { timezone, model }) {
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timezone, model });
  });
}
