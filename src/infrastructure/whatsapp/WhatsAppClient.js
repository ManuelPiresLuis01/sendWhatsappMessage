import whatsappWeb from "whatsapp-web.js";

const { Client, LocalAuth } = whatsappWeb;

export class WhatsAppClient {
  constructor() {
    this.client = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: {
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
      }
    });

    this.lastQr = null;
    this.lastQrAt = null;
    this.isReady = false;
    this.isAuthenticated = false;
    this.lastError = null;

    this.client.on("qr", (qr) => {
      this.lastQr = qr;
      this.lastQrAt = Date.now();
      this.isAuthenticated = false;
      this.isReady = false;
      this.lastError = null;
      console.log("WhatsApp QR received. Scan this in WhatsApp on your phone:");
      console.log(qr);
    });

    this.client.on("ready", () => {
      this.isReady = true;
      this.lastError = null;
      console.log("WhatsApp client is ready.");
    });

    this.client.on("authenticated", () => {
      this.isAuthenticated = true;
      this.lastQr = null;
      this.lastError = null;
      console.log("WhatsApp authenticated.");
    });

    this.client.on("auth_failure", (msg) => {
      this.isAuthenticated = false;
      this.isReady = false;
      this.lastError = msg || "auth_failure";
      console.error("WhatsApp auth failure:", msg);
    });

    this.client.on("disconnected", (reason) => {
      this.isAuthenticated = false;
      this.isReady = false;
      this.lastError = reason || "disconnected";
      console.error("WhatsApp disconnected:", reason);
    });
  }

  initialize() {
    return this.client.initialize().catch((error) => {
      this.lastError = error?.message || "init_failed";
      console.error("WhatsApp initialize failed:", error);
      throw error;
    });
  }

  onMessage(handler) {
    this.client.on("message", handler);
  }

  sendMessage(chatId, message) {
    return this.client.sendMessage(chatId, message);
  }

  getQr() {
    return this.lastQr;
  }

  getStatus() {
    return {
      ready: this.isReady,
      authenticated: this.isAuthenticated,
      lastQrAt: this.lastQrAt,
      error: this.lastError
    };
  }
}
