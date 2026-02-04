import { config, warnings } from "./config/env.js";
import { createApp } from "./presentation/http/app.js";
import { AutoReplyMessage } from "./application/usecases/AutoReplyMessage.js";
import { GeminiMessageGenerator } from "./infrastructure/gemini/GeminiMessageGenerator.js";
import { WhatsAppClient } from "./infrastructure/whatsapp/WhatsAppClient.js";
import { MongoMessageStore } from "./infrastructure/memory/MongoMessageStore.js";

const PING_INTERVAL_MS = 11 * 60 * 1000;

async function main() {
  warnings.forEach((warning) => console.warn(warning));

  const whatsappClient = new WhatsAppClient();
  whatsappClient.initialize();

  const app = createApp({
    qrProvider: {
      getQr: () => whatsappClient.getQr(),
      getStatus: () => whatsappClient.getStatus()
    }
  });

  let messageGenerator = null;

  try {
    messageGenerator = new GeminiMessageGenerator(config.geminiApiKey, config.geminiModel);
  } catch (error) {
    console.warn(error.message);
  }

  let messageStore = null;

  if (config.mongodbUri) {
    messageStore = new MongoMessageStore(config.mongodbUri, config.mongodbDbName);
    await messageStore.connect();
    console.log("MongoDB connected.");
  }

  const autoReply = new AutoReplyMessage({
    messageGenerator,
    messageSender: whatsappClient,
    messageStore,
    memoryLimit: config.memoryLimit,
    dailyLimit: config.dailyLimit,
    maxMessagesPerUser: config.maxMessagesPerUser
  });

  whatsappClient.onMessage(async (message) => {
    try {
      if (message.fromMe) {
        return;
      }

      if (message.from?.endsWith("@g.us")) {
        return;
      }

      const userId = String(message.from || "").replace(/\D/g, "");
      console.log(`Incoming message from: ${userId || message.from}`);

      await autoReply.execute(message);
    } catch (error) {
      console.error("Failed to reply:", error);
    }
  });

  app.listen(config.port, () => {
    console.log("Service running.");
  });

  const baseUrl = process.env.BASE_URL || `http://localhost:${config.port}`;

  setInterval(async () => {
    try {
      const response = await fetch(`${baseUrl}/ping`, { method: "GET" });
      if (!response.ok) {
        console.warn(`Ping failed: ${response.status}`);
      } else {
        console.log("pingou");
      }
    } catch (error) {
      console.warn("Ping error:", error?.message || error);
    }
  }, PING_INTERVAL_MS);
}

main().catch((error) => {
  console.error("Startup failed:", error);
  process.exit(1);
});
