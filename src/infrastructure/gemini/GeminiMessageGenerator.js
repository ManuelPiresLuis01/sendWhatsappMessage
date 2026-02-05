import { GoogleGenerativeAI } from "@google/generative-ai";

export class GeminiMessageGenerator {
  constructor(apiKey, modelNames) {
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }

    this.genAI = new GoogleGenerativeAI(apiKey);

    const normalized = (Array.isArray(modelNames) ? modelNames : [modelNames])
      .map((name) => String(name || "").trim())
      .filter(Boolean);

    if (!normalized.length) {
      throw new Error("No Gemini models configured");
    }

    this.modelNames = normalized;
  }

  async generate(prompt) {
    let lastError = null;

    for (const modelName of this.modelNames) {
      try {
        const model = this.genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text().trim();
      } catch (error) {
        lastError = error;
        const message = error?.message || error;
        console.warn(`Gemini model failed (${modelName}):`, message);
      }
    }

    throw lastError || new Error("All Gemini models failed");
  }
}
