import OpenAI from "openai";

export interface AIProviderConfig {
  baseUrl: string;
  apiKey: string;
  modelName: string;
}

export const AI_CONFIG_STORAGE_KEY = "ai-provider-config";

export function createOpenAIClient(config: AIProviderConfig): OpenAI {
  return new OpenAI({
    baseURL: config.baseUrl,
    apiKey: config.apiKey,
    dangerouslyAllowBrowser: false,
  });
}

export function isAIConfigured(config: AIProviderConfig | null): boolean {
  if (!config) return false;
  return !!(config.baseUrl && config.apiKey && config.modelName);
}
