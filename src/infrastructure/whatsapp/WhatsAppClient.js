import whatsappWeb from "whatsapp-web.js";
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

const { Client, LocalAuth } = whatsappWeb;

function resolveExecutablePath() {
  const configuredPath = process.env.PUPPETEER_EXECUTABLE_PATH;

  if (configuredPath && !configuredPath.includes("*")) {
    return configuredPath;
  }

  if (configuredPath && configuredPath.includes("*")) {
    try {
      const baseDir = path.resolve("/opt/render/.cache/puppeteer/chrome");
      const entries = fs.readdirSync(baseDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort()
        .reverse();

      for (const entry of entries) {
        const candidate = path.join(baseDir, entry, "chrome-linux64", "chrome");
        if (fs.existsSync(candidate)) {
          return candidate;
        }
      }
    } catch (error) {
      console.warn("Failed to resolve PUPPETEER_EXECUTABLE_PATH wildcard:", error?.message || error);
    }
  }

  return puppeteer.executablePath();
}

export class WhatsAppClient {
  constructor() {
    this.client = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: {
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        executablePath: resolveExecutablePath()
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
