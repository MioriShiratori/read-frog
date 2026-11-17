import type { AllProviderTypes, APIProviderTypes } from "@/types/config/provider"
import type { Theme } from "@/types/config/theme"
import customProviderLogo from "@/assets/providers/custom-provider.svg?url&no-inline"
import deeplxLogoDark from "@/assets/providers/deeplx-dark.svg?url&no-inline"
import deeplxLogoLight from "@/assets/providers/deeplx-light.svg?url&no-inline"
import tensdaqLogoColor from "@/assets/providers/tensdaq-color.svg?url&no-inline"
import { env } from "@/env"
import {
  API_PROVIDER_TYPES,
  DEDICATED_LLM_PROVIDER_TYPES,
  NON_API_TRANSLATE_PROVIDERS,
  NON_API_TRANSLATE_PROVIDERS_MAP,
  PROTOCOL_COMPATIBLE_LLM_PROVIDER_TYPES,
  PURE_API_PROVIDER_TYPES,
  PURE_TRANSLATE_PROVIDERS,
  TRANSLATE_PROVIDER_TYPES,
} from "@/types/config/provider"
import { omit, pick } from "@/types/utils"
import { i18n } from "@/utils/i18n"
import { getLobeIconsCDNUrlFn } from "../logo"

export const PROVIDER_ITEMS: Record<
  AllProviderTypes,
  {
    logo: (theme: Theme) => string
    name: string
    website: string
    /**
     * Where someone signs up for or copies this provider's key. Only providers that set it get
     * the "Get API key" button next to the API key field — absent means no button, because most
     * providers' key pages sit behind a console we cannot link straight into.
     */
    apiKeyUrl?: string
  }
> = {
  opencode: {
    logo: getLobeIconsCDNUrlFn("opencode"),
    name: "OpenCode",
    website: "https://opencode.ai",
    apiKeyUrl: "https://opencode.ai/auth",
  },
  lmstudio: {
    logo: getLobeIconsCDNUrlFn("lmstudio"),
    name: "LM Studio",
    website: "https://lmstudio.ai",
  },
  "microsoft-translate": {
    logo: getLobeIconsCDNUrlFn("microsoft-color"),
    name: NON_API_TRANSLATE_PROVIDERS_MAP["microsoft-translate"],
    website: "https://translator.microsoft.com",
  },
  "google-translate": {
    logo: getLobeIconsCDNUrlFn("google-color"),
    name: NON_API_TRANSLATE_PROVIDERS_MAP["google-translate"],
    website: "https://translate.google.com",
  },
  deeplx: {
    logo: (theme: Theme) => (theme === "light" ? deeplxLogoLight : deeplxLogoDark),
    name: "DeepLX",
    website: "https://deeplx.owo.network/",
  },
  deepl: {
    logo: (theme: Theme) => (theme === "light" ? deeplxLogoLight : deeplxLogoDark),
    name: "DeepL",
    website: "https://www.deepl.com/pro-api",
  },

  atlascloud: {
    logo: getLobeIconsCDNUrlFn("atlascloud"),
    name: "Atlas Cloud",
    website: "https://www.atlascloud.ai/",
    apiKeyUrl: "https://www.atlascloud.ai/",
  },
  "openai-compatible": {
    logo: () => customProviderLogo,
    name: "Custom Provider",
    website: `${env.WXT_WEBSITE_URL}/docs/providers/openai-compatible-providers`,
  },
  "open-responses": {
    logo: () => customProviderLogo,
    name: "Custom Provider",
    website: `${env.WXT_WEBSITE_URL}/docs/providers/openai-compatible-providers`,
  },
  openrouter: {
    logo: getLobeIconsCDNUrlFn("openrouter"),
    name: "OpenRouter",
    website: "https://openrouter.ai/",
  },
  minimax: {
    logo: getLobeIconsCDNUrlFn("minimax-color"),
    name: "MiniMax",
    website: "https://platform.minimax.io",
  },
  siliconflow: {
    logo: getLobeIconsCDNUrlFn("siliconcloud-color"),
    name: "SiliconFlow",
    website: "https://siliconflow.cn/",
  },
  openai: {
    logo: getLobeIconsCDNUrlFn("openai"),
    name: "OpenAI",
    website: "https://platform.openai.com",
  },
  azure: {
    logo: getLobeIconsCDNUrlFn("azure-color"),
    name: "Azure",
    website: "https://azure.microsoft.com/products/ai-services/openai-service",
  },
  deepseek: {
    logo: getLobeIconsCDNUrlFn("deepseek-color"),
    name: "DeepSeek",
    website: "https://platform.deepseek.com",
  },
  google: {
    logo: getLobeIconsCDNUrlFn("gemini-color"),
    name: "Gemini",
    website: "https://aistudio.google.com",
  },
  anthropic: {
    logo: getLobeIconsCDNUrlFn("anthropic"),
    name: "Anthropic",
    website: "https://console.anthropic.com",
  },
  xai: {
    logo: getLobeIconsCDNUrlFn("grok"),
    name: "Grok",
    website: "https://x.ai/api",
  },
  bedrock: {
    logo: getLobeIconsCDNUrlFn("bedrock-color"),
    name: "Amazon Bedrock",
    website: "https://aws.amazon.com/bedrock/",
  },
  groq: {
    logo: getLobeIconsCDNUrlFn("groq"),
    name: "Groq",
    website: "https://groq.com",
  },
  deepinfra: {
    logo: getLobeIconsCDNUrlFn("deepinfra-color"),
    name: "DeepInfra",
    website: "https://deepinfra.com",
  },
  mistral: {
    logo: getLobeIconsCDNUrlFn("mistral-color"),
    name: "Mistral AI",
    website: "https://mistral.ai",
  },
  togetherai: {
    logo: getLobeIconsCDNUrlFn("together-color"),
    name: "Together.ai",
    website: "https://together.ai",
  },
  cohere: {
    logo: getLobeIconsCDNUrlFn("cohere-color"),
    name: "Cohere",
    website: "https://cohere.com",
  },
  fireworks: {
    logo: getLobeIconsCDNUrlFn("fireworks-color"),
    name: "Fireworks AI",
    website: "https://fireworks.ai",
  },
  cerebras: {
    logo: getLobeIconsCDNUrlFn("cerebras-color"),
    name: "Cerebras",
    website: "https://cerebras.ai",
  },
  replicate: {
    logo: getLobeIconsCDNUrlFn("replicate"),
    name: "Replicate",
    website: "https://replicate.com",
  },
  perplexity: {
    logo: getLobeIconsCDNUrlFn("perplexity-color"),
    name: "Perplexity",
    website: "https://perplexity.ai",
  },
  tensdaq: {
    logo: () => tensdaqLogoColor,
    name: "Tensdaq",
    website: "https://dashboard.x-aio.com/zh/register?ref=c356c1daba9a4641a18e",
  },
  ollama: {
    logo: getLobeIconsCDNUrlFn("ollama"),
    name: "Ollama",
    website: "https://ollama.ai",
  },
  volcengine: {
    logo: getLobeIconsCDNUrlFn("volcengine-color"),
    name: "Volcengine",
    website: "https://www.volcengine.com/product/doubao",
  },
  alibaba: {
    logo: getLobeIconsCDNUrlFn("bailian-color"),
    name: "Alibaba Cloud",
    website: "https://modelstudio.alibabacloud.com/",
  },
  moonshotai: {
    logo: getLobeIconsCDNUrlFn("moonshot"),
    name: "Moonshot AI",
    website: "https://platform.moonshot.cn/",
  },
  huggingface: {
    logo: getLobeIconsCDNUrlFn("huggingface-color"),
    name: "Hugging Face",
    website: "https://huggingface.co/",
  },
}

export const NON_API_TRANSLATE_PROVIDER_ITEMS = pick(PROVIDER_ITEMS, NON_API_TRANSLATE_PROVIDERS)

export const TRANSLATE_PROVIDER_ITEMS = pick(PROVIDER_ITEMS, TRANSLATE_PROVIDER_TYPES)

export const PURE_TRANSLATE_PROVIDER_ITEMS = pick(
  TRANSLATE_PROVIDER_ITEMS,
  PURE_TRANSLATE_PROVIDERS,
)

export const LLM_PROVIDER_ITEMS = omit(TRANSLATE_PROVIDER_ITEMS, PURE_TRANSLATE_PROVIDERS)

export const API_PROVIDER_ITEMS = pick(PROVIDER_ITEMS, API_PROVIDER_TYPES)

const PROVIDER_NAME_I18N_KEYS = {
  "openai-compatible": "options.apiProviders.providers.name.customProvider",
  "open-responses": "options.apiProviders.providers.name.customProvider",
} as const satisfies Record<"openai-compatible" | "open-responses", string>

export function getProviderItemName(providerType: APIProviderTypes): string {
  if (providerType !== "openai-compatible" && providerType !== "open-responses") {
    return PROVIDER_ITEMS[providerType].name
  }

  return i18n.t(PROVIDER_NAME_I18N_KEYS[providerType]) || PROVIDER_ITEMS[providerType].name
}

export const PROVIDER_GROUPS = {
  builtInProviders: {
    types: [...DEDICATED_LLM_PROVIDER_TYPES, "opencode", "lmstudio"],
    tutorialSlug: "built-in-providers",
  },
  compatibleProviders: {
    types: PROTOCOL_COMPATIBLE_LLM_PROVIDER_TYPES.filter(
      (type) => !["opencode", "lmstudio", "open-responses"].includes(type),
    ),
    tutorialSlug: "openai-compatible-providers",
  },
  pureTranslationProviders: {
    types: PURE_API_PROVIDER_TYPES,
    tutorialSlug: "pure-translation-providers",
  },
} as const satisfies Record<string, { types: readonly APIProviderTypes[]; tutorialSlug: string }>

export const SPECIFIC_TUTORIAL_PROVIDER_TYPES = [
  "ollama",
  "deeplx",
  "deepl",
] as const satisfies readonly APIProviderTypes[]
