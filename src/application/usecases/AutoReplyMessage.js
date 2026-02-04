import { buildAutoReplyPrompt } from "../../domain/autoReplyPrompt.js";

export function normalizeUserId(from) {
  if (!from) {
    return "";
  }

  return String(from).replace(/\D/g, "");
}

function getRetryDelayMs(error) {
  const retryInfo = error?.errorDetails?.find((item) => item["@type"]?.includes("RetryInfo"));
  const retryDelay = retryInfo?.retryDelay;

  if (!retryDelay) {
    return 0;
  }

  const seconds = Number(String(retryDelay).replace("s", ""));
  return Number.isFinite(seconds) ? seconds * 1000 : 0;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function detectLanguage(text) {
  if (!text) {
    return "en";
  }

  if (/[��������]/i.test(text)) {
    return "pt";
  }

  const tokens = [
    "ola",
    "ol�",
    "bom",
    "boa",
    "tudo",
    "bem",
    "voce",
    "voc�",
    "nao",
    "n�o",
    "obrigado",
    "obrigada",
    "por",
    "favor",
    "sim"
  ];

  const lower = text.toLowerCase();
  const matches = tokens.filter((token) => lower.includes(token)).length;
  return matches >= 2 ? "pt" : "en";
}

function getLimitMessage(language) {
  if (language === "pt") {
    return "Voce atingiu o limite diario. Volte amanha ou faca upgrade para o plano premium.";
  }

  return "You have reached your daily limit. Please come back tomorrow or upgrade to the premium plan.";
}

function getDateKey() {
  return new Date().toISOString().slice(0, 10);
}

export class AutoReplyMessage {
  constructor({ messageGenerator, messageSender, messageStore, memoryLimit, dailyLimit, maxMessagesPerUser }) {
    this.messageGenerator = messageGenerator;
    this.messageSender = messageSender;
    this.messageStore = messageStore;
    this.memoryLimit = memoryLimit;
    this.dailyLimit = dailyLimit;
    this.maxMessagesPerUser = maxMessagesPerUser;
  }

  async execute(incomingMessage) {
    if (!this.messageGenerator) {
      console.warn("Reply skipped: GEMINI_API_KEY is not set.");
      return;
    }

    if (!incomingMessage?.body) {
      return;
    }

    const userId = normalizeUserId(incomingMessage.from);
    let memory = [];

    if (this.messageStore && userId) {
      await this.messageStore.ensureUser(userId);
      await this.messageStore.addMessage(userId, "user", incomingMessage.body);
      await this.messageStore.trimToLimit(userId, "user", this.memoryLimit);

      if (this.maxMessagesPerUser) {
        await this.messageStore.cleanUp(userId, this.maxMessagesPerUser);
      }

      const count = await this.messageStore.incrementDailyCount(userId, getDateKey());
      if (count > this.dailyLimit) {
        const language = detectLanguage(incomingMessage.body);
        const limitMessage = getLimitMessage(language);
        await this.messageSender.sendMessage(incomingMessage.from, limitMessage);
        await this.messageStore.addMessage(userId, "bot", limitMessage);
        await this.messageStore.trimToLimit(userId, "bot", this.memoryLimit);
        if (this.maxMessagesPerUser) {
          await this.messageStore.cleanUp(userId, this.maxMessagesPerUser);
        }
        return;
      }

      memory = await this.messageStore.getConversation(userId, this.memoryLimit);
    }

    const prompt = buildAutoReplyPrompt({
      incomingText: incomingMessage.body,
      memory
    });

    let reply = "";

    try {
      reply = await this.messageGenerator.generate(prompt);
    } catch (error) {
      if (error?.status === 429) {
        const delayMs = Math.max(getRetryDelayMs(error), 30000);
        console.warn(`Rate limited. Retrying in ${Math.ceil(delayMs / 1000)}s...`);
        await sleep(delayMs);

        try {
          reply = await this.messageGenerator.generate(prompt);
        } catch (retryError) {
          console.error("Gemini retry failed:", retryError);
          reply = "right now I cant answer message, try again later";
        }
      } else {
        console.error("Gemini reply failed:", error);
        reply = "right now I cant answer message, try again later";
      }
    }

    if (!reply) {
      return;
    }

    await this.messageSender.sendMessage(incomingMessage.from, reply);

    if (this.messageStore && userId) {
      await this.messageStore.addMessage(userId, "bot", reply);
      await this.messageStore.trimToLimit(userId, "bot", this.memoryLimit);
      if (this.maxMessagesPerUser) {
        await this.messageStore.cleanUp(userId, this.maxMessagesPerUser);
      }
    }
  }
}
