import QRCode from "qrcode";

export function registerQrRoutes(app, { getQr, getStatus }) {
  app.get("/qr.json", async (_req, res) => {
    const qr = getQr();
    const status = getStatus();

    if (!qr) {
      res.json({ qr: null, qrDataUrl: null, status });
      return;
    }

    try {
      const qrDataUrl = await QRCode.toDataURL(qr, { width: 280, margin: 1 });
      res.json({ qr, qrDataUrl, status });
    } catch (error) {
      res.json({ qr, qrDataUrl: null, status, error: "qr_render_failed" });
    }
  });

  app.get("/", async (_req, res) => {
    const qr = getQr();
    const status = getStatus();
    let qrDataUrl = null;

    if (qr) {
      try {
        qrDataUrl = await QRCode.toDataURL(qr, { width: 280, margin: 1 });
      } catch (error) {
        qrDataUrl = null;
      }
    }

    const initialImage = qrDataUrl
      ? `<img src="${qrDataUrl}" alt="WhatsApp QR" />`
      : `<span class="status">Waiting for QR...</span>`;

    res.type("html").send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>WhatsApp QR</title>
    <style>
      :root {
        color-scheme: light;
        font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
      }
      body {
        margin: 0;
        background: #0f172a;
        color: #e2e8f0;
        display: grid;
        place-items: center;
        min-height: 100vh;
      }
      .card {
        background: #111827;
        border: 1px solid #1f2937;
        border-radius: 16px;
        padding: 24px;
        width: min(440px, 92vw);
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35);
        text-align: center;
      }
      h1 {
        font-size: 22px;
        margin: 0 0 8px;
      }
      p {
        margin: 0 0 16px;
        color: #94a3b8;
      }
      #qr {
        width: 280px;
        height: 280px;
        margin: 0 auto 16px;
        background: #0b1220;
        border-radius: 12px;
        display: grid;
        place-items: center;
        overflow: hidden;
      }
      #qr img {
        width: 100%;
        height: 100%;
        border-radius: 12px;
      }
      .status {
        font-size: 14px;
        color: #cbd5f5;
      }
      .badge {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 999px;
        font-size: 12px;
        margin-top: 8px;
      }
      .ok {
        background: #064e3b;
        color: #a7f3d0;
      }
      .waiting {
        background: #1e293b;
        color: #e2e8f0;
      }
      .error {
        background: #7f1d1d;
        color: #fecaca;
      }
      .small {
        font-size: 12px;
        color: #94a3b8;
        margin-top: 10px;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Scan WhatsApp QR</h1>
      <p>Open WhatsApp -> Linked devices -> Link a device</p>
      <div id="qr">${initialImage}</div>
      <div id="status" class="status"></div>
      <div id="badge" class="badge waiting">Not connected</div>
      <div id="error" class="small"></div>
    </div>

    <script>
      const qrContainer = document.getElementById("qr");
      const statusEl = document.getElementById("status");
      const badgeEl = document.getElementById("badge");
      const errorEl = document.getElementById("error");

      function setBadge(state) {
        if (state === "ok") {
          badgeEl.className = "badge ok";
          badgeEl.textContent = "Connected";
          return;
        }
        if (state === "error") {
          badgeEl.className = "badge error";
          badgeEl.textContent = "Error";
          return;
        }
        badgeEl.className = "badge waiting";
        badgeEl.textContent = "Not connected";
      }

      async function refresh() {
        try {
          const res = await fetch("/qr.json", { cache: "no-store" });
          const data = await res.json();

          if (data.qrDataUrl) {
            const img = document.createElement("img");
            img.src = data.qrDataUrl;
            qrContainer.innerHTML = "";
            qrContainer.appendChild(img);
          } else if (data.qr) {
            qrContainer.innerHTML = "<span class=\"status\">QR received. Rendering...</span>";
          } else {
            qrContainer.innerHTML = "<span class=\"status\">Waiting for QR...</span>";
          }

          const status = data.status || {};
          statusEl.textContent = "Authenticated: " + Boolean(status.authenticated) + " | Ready: " + Boolean(status.ready);

          if (status.error) {
            setBadge("error");
            errorEl.textContent = "WhatsApp error: " + status.error;
          } else {
            errorEl.textContent = "";
            setBadge(Boolean(status.authenticated) ? "ok" : "waiting");
          }
        } catch (error) {
          qrContainer.innerHTML = "<span class=\"status\">Failed to load QR.</span>";
          statusEl.textContent = "";
          errorEl.textContent = "";
          setBadge("error");
        }
      }

      refresh();
      setInterval(refresh, 3000);
    </script>
  </body>
</html>`);
  });
}
