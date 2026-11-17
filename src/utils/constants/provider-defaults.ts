import type {
  AllProviderTypes,
  APIProviderTypes,
  LLMProviderTypes,
  ProviderConfig,
  ProvidersConfig,
} from "@/types/config/provider"
import { APP_NAME } from "@read-frog/definitions"
import { camelCase } from "case-anything"
import { env } from "@/env"
import { isAPIProviderConfig } from "@/types/config/provider"
import { i18n } from "@/utils/i18n"
import { PROVIDER_ITEMS } from "./provider-items"
import { DEFAULT_LLM_PROVIDER_MODELS } from "./provider-models"

export const DEFAULT_PROVIDER_CONFIG = {
  opencode: {
    id: "opencode-default",
    name: "OpenCode",
    enabled: true,
    provider: "opencode",
    baseURL: "https://opencode.ai/inference/openai/v1",
    service: "pay-as-you-go",
    model: DEFAULT_LLM_PROVIDER_MODELS.opencode,
    reasoning: "none",
  },
  lmstudio: {
    id: "lmstudio-default",
    name: "LM Studio",
    enabled: true,
    provider: "lmstudio",
    baseURL: "http://127.0.0.1:1234/v1",
    model: DEFAULT_LLM_PROVIDER_MODELS.lmstudio,
    reasoning: "none",
  },

  "google-translate": {
    id: "google-translate-default",
    name: PROVIDER_ITEMS["google-translate"].name,
    enabled: true,
    provider: "google-translate",
  },
  "microsoft-translate": {
    id: "microsoft-translate-default",
    name: PROVIDER_ITEMS["microsoft-translate"].name,
    enabled: true,
    provider: "microsoft-translate",
  },

  atlascloud: {
    id: "atlascloud-default",
    name: PROVIDER_ITEMS.atlascloud.name,
    enabled: true,
    provider: "atlascloud",
    baseURL: "https://api.atlascloud.ai/v1",
    model: DEFAULT_LLM_PROVIDER_MODELS.atlascloud,
    reasoning: "none",
  },
  siliconflow: {
    id: "siliconflow-default",
    name: PROVIDER_ITEMS.siliconflow.name,
    enabled: true,
    provider: "siliconflow",
    baseURL: "https://api.siliconflow.cn/v1",
    model: DEFAULT_LLM_PROVIDER_MODELS.siliconflow,
    reasoning: "none",
  },
  tensdaq: {
    id: "tensdaq-default",
    name: PROVIDER_ITEMS.tensdaq.name,
    enabled: true,
    provider: "tensdaq",
    baseURL: "https://tensdaq-api.x-aio.com/v1",
    model: DEFAULT_LLM_PROVIDER_MODELS.tensdaq,
    reasoning: "none",
  },
  "openai-compatible": {
    id: "openai-compatible-default",
    name: PROVIDER_ITEMS["openai-compatible"].name,
    enabled: true,
    provider: "openai-compatible",
    baseURL: "https://api.example.com/v1",
    model: DEFAULT_LLM_PROVIDER_MODELS["openai-compatible"],
    reasoning: "none",
  },
  "open-responses": {
    id: "open-responses-default",
    name: PROVIDER_ITEMS["open-responses"].name,
    enabled: true,
    provider: "open-responses",
    url: "https://api.example.com/v1/responses",
    model: DEFAULT_LLM_PROVIDER_MODELS["open-responses"],
    reasoning: "none",
  },
  openai: {
    id: "openai-default",
    name: PROVIDER_ITEMS.openai.name,
    enabled: true,
    provider: "openai",
    model: DEFAULT_LLM_PROVIDER_MODELS.openai,
    reasoning: "none",
  },
  azure: {
    id: "azure-default",
    name: PROVIDER_ITEMS.azure.name,
    enabled: true,
    provider: "azure",
    model: DEFAULT_LLM_PROVIDER_MODELS.azure,
    reasoning: "none",
    providerSpecificSettings: {
      apiMode: "responses",
      apiVersion: "v1",
    },
  },
  deepseek: {
    id: "deepseek-default",
    name: PROVIDER_ITEMS.deepseek.name,
    enabled: true,
    provider: "deepseek",
    model: DEFAULT_LLM_PROVIDER_MODELS.deepseek,
    reasoning: "none",
  },
  google: {
    id: "google-default",
    name: PROVIDER_ITEMS.google.name,
    enabled: true,
    provider: "google",
    model: DEFAULT_LLM_PROVIDER_MODELS.google,
    reasoning: "none",
  },
  anthropic: {
    id: "anthropic-default",
    name: PROVIDER_ITEMS.anthropic.name,
    enabled: true,
    provider: "anthropic",
    model: DEFAULT_LLM_PROVIDER_MODELS.anthropic,
    reasoning: "none",
  },
  xai: {
    id: "xai-default",
    name: PROVIDER_ITEMS.xai.name,
    enabled: true,
    provider: "xai",
    model: DEFAULT_LLM_PROVIDER_MODELS.xai,
    reasoning: "none",
  },
  deeplx: {
    id: "deeplx-default",
    name: PROVIDER_ITEMS.deeplx.name,
    enabled: true,
    provider: "deeplx",
    baseURL: "https://api.deeplx.org/{{apiKey}}/translate",
  },
  deepl: {
    id: "deepl-default",
    name: PROVIDER_ITEMS.deepl.name,
    enabled: true,
    provider: "deepl",
  },
  bedrock: {
    id: "bedrock-default",
    name: PROVIDER_ITEMS.bedrock.name,
    enabled: true,
    provider: "bedrock",
    model: DEFAULT_LLM_PROVIDER_MODELS.bedrock,
    reasoning: "none",
    providerSpecificSettings: { region: "us-east-1" },
  },
  groq: {
    id: "groq-default",
    name: PROVIDER_ITEMS.groq.name,
    enabled: true,
    provider: "groq",
    model: DEFAULT_LLM_PROVIDER_MODELS.groq,
    reasoning: "none",
  },
  deepinfra: {
    id: "deepinfra-default",
    name: PROVIDER_ITEMS.deepinfra.name,
    enabled: true,
    provider: "deepinfra",
    model: DEFAULT_LLM_PROVIDER_MODELS.deepinfra,
    reasoning: "none",
  },
  mistral: {
    id: "mistral-default",
    name: PROVIDER_ITEMS.mistral.name,
    enabled: true,
    provider: "mistral",
    model: DEFAULT_LLM_PROVIDER_MODELS.mistral,
    reasoning: "none",
  },
  togetherai: {
    id: "togetherai-default",
    name: PROVIDER_ITEMS.togetherai.name,
    enabled: true,
    provider: "togetherai",
    model: DEFAULT_LLM_PROVIDER_MODELS.togetherai,
    reasoning: "none",
  },
  cohere: {
    id: "cohere-default",
    name: PROVIDER_ITEMS.cohere.name,
    enabled: true,
    provider: "cohere",
    model: DEFAULT_LLM_PROVIDER_MODELS.cohere,
    reasoning: "none",
  },
  fireworks: {
    id: "fireworks-default",
    name: PROVIDER_ITEMS.fireworks.name,
    enabled: true,
    provider: "fireworks",
    model: DEFAULT_LLM_PROVIDER_MODELS.fireworks,
    reasoning: "none",
  },
  cerebras: {
    id: "cerebras-default",
    name: PROVIDER_ITEMS.cerebras.name,
    enabled: true,
    provider: "cerebras",
    model: DEFAULT_LLM_PROVIDER_MODELS.cerebras,
    reasoning: "none",
  },
  replicate: {
    id: "replicate-default",
    name: PROVIDER_ITEMS.replicate.name,
    enabled: true,
    provider: "replicate",
    model: DEFAULT_LLM_PROVIDER_MODELS.replicate,
    reasoning: "none",
  },
  perplexity: {
    id: "perplexity-default",
    name: PROVIDER_ITEMS.perplexity.name,
    enabled: true,
    provider: "perplexity",
    model: DEFAULT_LLM_PROVIDER_MODELS.perplexity,
    reasoning: "none",
  },
  openrouter: {
    id: "openrouter-default",
    name: PROVIDER_ITEMS.openrouter.name,
    enabled: true,
    provider: "openrouter",
    baseURL: "https://openrouter.ai/api/v1",
    model: DEFAULT_LLM_PROVIDER_MODELS.openrouter,
    reasoning: "none",
  },
  ollama: {
    id: "ollama-default",
    name: PROVIDER_ITEMS.ollama.name,
    enabled: true,
    provider: "ollama",
    model: DEFAULT_LLM_PROVIDER_MODELS.ollama,
    reasoning: "none",
  },
  volcengine: {
    id: "volcengine-default",
    name: PROVIDER_ITEMS.volcengine.name,
    enabled: true,
    provider: "volcengine",
    baseURL: "https://ark.cn-beijing.volces.com/api/v3",
    model: DEFAULT_LLM_PROVIDER_MODELS.volcengine,
    reasoning: "none",
  },
  minimax: {
    id: "minimax-default",
    name: PROVIDER_ITEMS.minimax.name,
    enabled: true,
    provider: "minimax",
    baseURL: "https://api.minimax.io/v1",
    model: DEFAULT_LLM_PROVIDER_MODELS.minimax,
    reasoning: "none",
  },
  alibaba: {
    id: "alibaba-default",
    name: PROVIDER_ITEMS.alibaba.name,
    enabled: true,
    provider: "alibaba",
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model: DEFAULT_LLM_PROVIDER_MODELS.alibaba,
    reasoning: "none",
  },
  moonshotai: {
    id: "moonshotai-default",
    name: PROVIDER_ITEMS.moonshotai.name,
    enabled: true,
    provider: "moonshotai",
    model: DEFAULT_LLM_PROVIDER_MODELS.moonshotai,
    reasoning: "none",
  },
  huggingface: {
    id: "huggingface-default",
    name: PROVIDER_ITEMS.huggingface.name,
    enabled: true,
    provider: "huggingface",
    model: DEFAULT_LLM_PROVIDER_MODELS.huggingface,
    reasoning: "none",
  },
} as const satisfies Record<AllProviderTypes, ProviderConfig>

export const GOOGLE_TRANSLATE_PROVIDER_ID = DEFAULT_PROVIDER_CONFIG["google-translate"].id
export const MICROSOFT_TRANSLATE_PROVIDER_ID = DEFAULT_PROVIDER_CONFIG["microsoft-translate"].id

/**
 * Headers a provider is always called with, merged over whatever the user set. The user may add
 * headers alongside these but cannot drop or rewrite them, and they never enter stored config —
 * which is also what makes them ours to change in a later release. A header a provider merely
 * starts out with belongs in `DEFAULT_PROVIDER_CONFIG[provider].headers` instead, where the user
 * owns it.
 */
export const FORCED_PROVIDER_HEADERS: Partial<Record<LLMProviderTypes, Record<string, string>>> = {
  openrouter: {
    "HTTP-Referer": env.WXT_WEBSITE_URL,
    "X-OpenRouter-Title": APP_NAME,
  },
  // Anthropic's API refuses direct browser calls without this, so it is not a default the user
  // can outgrow — it used to sit with the editable ones, where adding any header of your own
  // dropped it and broke every request.
  anthropic: {
    "anthropic-dangerous-direct-browser-access": "true",
  },
}

export const PROVIDER_URL_PLACEHOLDERS: Partial<Record<APIProviderTypes, string>> = {
  atlascloud: DEFAULT_PROVIDER_CONFIG.atlascloud.baseURL,
  siliconflow: DEFAULT_PROVIDER_CONFIG.siliconflow.baseURL,
  tensdaq: DEFAULT_PROVIDER_CONFIG.tensdaq.baseURL,
  opencode: DEFAULT_PROVIDER_CONFIG.opencode.baseURL,
  lmstudio: DEFAULT_PROVIDER_CONFIG.lmstudio.baseURL,
  "openai-compatible": DEFAULT_PROVIDER_CONFIG["openai-compatible"].baseURL,
  "open-responses": DEFAULT_PROVIDER_CONFIG["open-responses"].url,
  openai: "https://api.openai.com/v1",
  azure: "https://<resource>.services.ai.azure.com/openai",
  deepseek: "https://api.deepseek.com",
  google: "https://generativelanguage.googleapis.com/v1beta",
  anthropic: "https://api.anthropic.com/v1",
  xai: "https://api.x.ai/v1",
  deeplx: DEFAULT_PROVIDER_CONFIG.deeplx.baseURL,
  bedrock: "https://bedrock-runtime.us-east-1.amazonaws.com",
  groq: "https://api.groq.com/openai/v1",
  deepinfra: "https://api.deepinfra.com/v1",
  mistral: "https://api.mistral.ai/v1",
  togetherai: "https://api.together.xyz/v1",
  cohere: "https://api.cohere.com/v2",
  fireworks: "https://api.fireworks.ai/inference/v1",
  cerebras: "https://api.cerebras.ai/v1",
  replicate: "https://api.replicate.com/v1",
  perplexity: "https://api.perplexity.ai",
  openrouter: "https://openrouter.ai/api/v1",
  ollama: "http://127.0.0.1:11434/",
  volcengine: DEFAULT_PROVIDER_CONFIG.volcengine.baseURL,
  minimax: DEFAULT_PROVIDER_CONFIG.minimax.baseURL,
  alibaba: DEFAULT_PROVIDER_CONFIG.alibaba.baseURL,
  moonshotai: "https://api.moonshot.ai/v1",
  huggingface: "https://router.huggingface.co/v1",
}

export const DEFAULT_PROVIDER_CONFIG_LIST: ProvidersConfig = [
  DEFAULT_PROVIDER_CONFIG["google-translate"],
  DEFAULT_PROVIDER_CONFIG["microsoft-translate"],
  DEFAULT_PROVIDER_CONFIG.openai,
  DEFAULT_PROVIDER_CONFIG.deepseek,
]

/** Resolve a provider's default description in the active interface language. */
export function getDefaultProviderDescription(providerType: APIProviderTypes): string | undefined {
  const descriptionKey = camelCase(providerType)
  const description = i18n.t(
    `options.apiProviders.providers.description.${descriptionKey}` as never,
  )
  return description || undefined
}

/**
 * Build providers for a fresh config after i18n has initialized, so descriptions are
 * persisted in the same interface language as providers created from the options page.
 */
export function buildDefaultProviderConfigList(): ProvidersConfig {
  return structuredClone(DEFAULT_PROVIDER_CONFIG_LIST).map((providerConfig) => {
    if (!isAPIProviderConfig(providerConfig)) {
      return providerConfig
    }

    const description = getDefaultProviderDescription(providerConfig.provider)
    return description ? { ...providerConfig, description } : providerConfig
  })
}
