import { GoogleGenerativeAI } from "@google/generative-ai";

export class GeminiMessageGenerator {
  constructor(apiKey, modelName) {
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = modelName;
  }

  async generate(prompt) {
    const model = this.genAI.getGenerativeModel({ model: this.modelName });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  }
}
