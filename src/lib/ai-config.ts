import OpenAI from "openai";

export type AIProviderType = "nvidia" | "openai" | "ollama" | "custom";

export interface AIProviderConfig {
  baseUrl: string;
  apiKey: string;
  modelName: string;
  provider?: AIProviderType;
}

export interface ProviderDefaults {
  label: string;
  baseUrl: string;
  modelName: string;
  icon: string;
  description: string;
}

export const PROVIDER_DEFAULTS: Record<AIProviderType, ProviderDefaults> = {
  nvidia: {
    label: "NVIDIA NIM",
    baseUrl: "https://integrate.api.nvidia.com/v1",
    modelName: "meta/llama-3.1-8b-instruct",
    icon: "🟣",
    description: "NVIDIA NIM - Modelos optimizados con TensorRT",
  },
  openai: {
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    modelName: "gpt-4o-mini",
    icon: "🟢",
    description: "OpenAI - GPT-4o, GPT-4o-mini y mas",
  },
  ollama: {
    label: "Ollama",
    baseUrl: "http://localhost:11434/v1",
    modelName: "llama3",
    icon: "🦙",
    description: "Ollama - Modelos locales en tu maquina",
  },
  custom: {
    label: "Custom",
    baseUrl: "",
    modelName: "",
    icon: "⚙️",
    description: "Proveedor personalizado compatible con OpenAI",
  },
};

export const AI_CONFIG_STORAGE_KEY = "ai-provider-config";

export function createOpenAIClient(config: AIProviderConfig): OpenAI {
  return new OpenAI({
    baseURL: config.baseUrl,
    apiKey: config.apiKey,
    dangerouslyAllowBrowser: false,
  });
}

/**
 * Check if AI is properly configured.
 * For known providers (nvidia, openai, ollama), only an API key is required
 * since baseUrl and modelName have well-known defaults.
 * For custom providers, all three fields are required.
 */
export function isAIConfigured(config: AIProviderConfig | null): boolean {
  if (!config) return false;

  // If a known provider is set, only the API key is strictly required
  // (baseUrl and modelName will use defaults if empty)
  if (config.provider && config.provider !== "custom") {
    return !!config.apiKey;
  }

  // For custom or unset provider, require all fields
  return !!(config.baseUrl && config.apiKey && config.modelName);
}

/**
 * Get the effective config with defaults filled in for known providers.
 */
export function getEffectiveConfig(config: AIProviderConfig): AIProviderConfig {
  if (config.provider && config.provider !== "custom") {
    const defaults = PROVIDER_DEFAULTS[config.provider];
    return {
      ...config,
      baseUrl: config.baseUrl || defaults.baseUrl,
      modelName: config.modelName || defaults.modelName,
    };
  }
  return config;
}
