import dotenv from "dotenv";

dotenv.config();

const baseConfig = {
  port: Number(process.env.PORT || 3000),
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  geminiModel: process.env.GEMINI_MODEL || "gemini-1.5-flash",
  mongodbUri: process.env.MONGODB_URI || "",
  mongodbDbName: process.env.MONGODB_DB || "whatsapp_bot",
  memoryLimit: Number(process.env.MEMORY_LIMIT || 10),
  dailyLimit: Number(process.env.DAILY_LIMIT || 30),
  maxMessagesPerUser: Number(process.env.MAX_MESSAGES_PER_USER || 200)
};

const warnings = [];

if (!baseConfig.geminiApiKey) {
  warnings.push("Missing GEMINI_API_KEY in environment. The bot will not reply until it's set.");
}

if (!baseConfig.mongodbUri) {
  warnings.push("Missing MONGODB_URI in environment. The bot memory will not work until it's set.");
}

export const config = {
  ...baseConfig
};

export { warnings };
