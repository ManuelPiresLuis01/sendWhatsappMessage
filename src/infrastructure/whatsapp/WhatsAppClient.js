import whatsappWeb from "whatsapp-web.js";
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

const { Client, LocalAuth } = whatsappWeb;

const PLATFORM = process.platform;
const CACHE_VARIANTS = {
  win32: [{ dir: "chrome-win64", exe: "chrome.exe" }],
  linux: [{ dir: "chrome-linux64", exe: "chrome" }],
  darwin: [
    { dir: "chrome-mac-arm64", exe: "Chromium.app/Contents/MacOS/Chromium" },
    { dir: "chrome-mac-x64", exe: "Chromium.app/Contents/MacOS/Chromium" }
  ]
};

function fileExists(targetPath) {
  return Boolean(targetPath) && fs.existsSync(targetPath);
}

function findChromeInCache(cacheDir) {
  if (!cacheDir) return null;
  const baseDir = path.join(cacheDir, "chrome");
  if (!fs.existsSync(baseDir)) return null;

  try {
    const entries = fs
      .readdirSync(baseDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()
      .reverse();

    const variants = CACHE_VARIANTS[PLATFORM] || CACHE_VARIANTS.linux;

    for (const entry of entries) {
      for (const variant of variants) {
        const candidate = path.join(baseDir, entry, variant.dir, variant.exe);
        if (fs.existsSync(candidate)) {
          return candidate;
        }
      }
    }
  } catch (_error) {
    return null;
  }

  return null;
}

function resolveExecutablePath() {
  const configuredPath = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (configuredPath && !configuredPath.includes("*") && fileExists(configuredPath)) {
    return configuredPath;
  }

  const cacheDir = process.env.PUPPETEER_CACHE_DIR;
  const candidates = [
    cacheDir,
    "/opt/render/project/.cache/puppeteer",
    "/opt/render/.cache/puppeteer"
  ].filter((dir) => Boolean(dir) && fs.existsSync(dir));

  for (const dir of candidates) {
    const found = findChromeInCache(dir);
    if (found) {
      return found;
    }
  }

  const puppeteerPath = puppeteer.executablePath();
  if (fileExists(puppeteerPath)) {
    return puppeteerPath;
  }

  if (PLATFORM === "win32") {
    const programFiles = process.env["PROGRAMFILES"] || "C:\\Program Files";
    const programFilesX86 = process.env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)";
    const localAppData = process.env.LOCALAPPDATA;
    const userProfile = process.env.USERPROFILE;
    const winCandidates = [
      localAppData && path.join(localAppData, "Google", "Chrome", "Application", "chrome.exe"),
      programFiles && path.join(programFiles, "Google", "Chrome", "Application", "chrome.exe"),
      programFilesX86 && path.join(programFilesX86, "Google", "Chrome", "Application", "chrome.exe"),
      userProfile && path.join(userProfile, ".cache", "puppeteer", "chrome", "chrome-win64", "chrome.exe")
    ].filter(Boolean);

    for (const candidate of winCandidates) {
      if (fileExists(candidate)) {
        return candidate;
      }
    }
  }

  return puppeteerPath;
}

export class WhatsAppClient {
  constructor() {
    const executablePath = resolveExecutablePath();
    console.log("Using Chrome executable:", executablePath);

    this.client = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: {
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        executablePath
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