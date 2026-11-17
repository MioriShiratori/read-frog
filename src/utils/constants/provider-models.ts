import type { LLMProviderModels } from "@/types/config/provider"

export const DEFAULT_LLM_PROVIDER_MODELS: LLMProviderModels = {
  opencode: { model: "use-custom-model", isCustomModel: true, customModel: null },
  lmstudio: { model: "use-custom-model", isCustomModel: true, customModel: null },
  openrouter: {
    model: "google/gemma-4-31b-it:free",
    isCustomModel: false,
    customModel: null,
  },

  atlascloud: {
    model: "deepseek-ai/deepseek-v4-flash",
    isCustomModel: false,
    customModel: null,
  },
  "openai-compatible": {
    model: "use-custom-model",
    isCustomModel: true,
    customModel: null,
  },
  "open-responses": {
    model: "use-custom-model",
    isCustomModel: true,
    customModel: null,
  },
  openai: {
    model: "gpt-6-luna",
    isCustomModel: false,
    customModel: null,
  },
  azure: {
    model: "gpt-5.6-luna",
    isCustomModel: false,
    customModel: null,
  },
  deepseek: {
    model: "deepseek-v4-flash",
    isCustomModel: false,
    customModel: null,
  },
  google: {
    model: "gemini-3.5-flash-lite",
    isCustomModel: false,
    customModel: null,
  },
  anthropic: {
    model: "claude-haiku-5-5",
    isCustomModel: false,
    customModel: null,
  },
  xai: {
    model: "grok-4.3",
    isCustomModel: false,
    customModel: null,
  },
  bedrock: {
    model: "us.amazon.nova-micro-v1:0",
    isCustomModel: false,
    customModel: null,
  },
  groq: {
    model: "openai/gpt-oss-20b",
    isCustomModel: false,
    customModel: null,
  },
  deepinfra: {
    model: "Qwen/Qwen3.5-9B",
    isCustomModel: false,
    customModel: null,
  },
  mistral: {
    model: "mistral-small-latest",
    isCustomModel: false,
    customModel: null,
  },
  togetherai: {
    model: "Qwen/Qwen3.5-9B",
    isCustomModel: false,
    customModel: null,
  },
  cohere: {
    model: "command-a-translate-08-2025",
    isCustomModel: false,
    customModel: null,
  },
  fireworks: {
    model: "accounts/fireworks/models/gpt-oss-120b",
    isCustomModel: false,
    customModel: null,
  },
  cerebras: {
    model: "gpt-oss-120b",
    isCustomModel: false,
    customModel: null,
  },
  replicate: {
    model: "meta/meta-llama-3.1-70b-instruct",
    isCustomModel: false,
    customModel: null,
  },
  perplexity: {
    model: "perplexity/sonar",
    isCustomModel: false,
    customModel: null,
  },
  ollama: {
    model: "gemma3:4b",
    isCustomModel: false,
    customModel: null,
  },
  siliconflow: {
    model: "Qwen/Qwen3-Next-80B-A3B-Instruct",
    isCustomModel: true,
    customModel: null,
  },
  tensdaq: {
    model: "Qwen3-30B-A3B-Instruct-2507",
    isCustomModel: true,
    customModel: null,
  },
  volcengine: {
    model: "doubao-seed-1-6-flash-250828",
    isCustomModel: true,
    customModel: null,
  },
  minimax: {
    model: "MiniMax-M2.7",
    isCustomModel: false,
    customModel: null,
  },
  alibaba: {
    model: "qwen3.8-flash",
    isCustomModel: false,
    customModel: null,
  },
  moonshotai: {
    model: "kimi-k2.6",
    isCustomModel: false,
    customModel: null,
  },
  huggingface: {
    model: "Qwen/Qwen3.5-9B",
    isCustomModel: false,
    customModel: null,
  },
}
