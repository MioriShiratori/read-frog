import type { ProtocolCompatibleLLMProviderConfig } from "@/types/config/provider"
import { describe, expect, it } from "vitest"
import { getProviderModelsURL } from "../models-url"

const model = {
  model: "use-custom-model",
  isCustomModel: true,
  customModel: "test-model",
} as const

const openAICompatibleConfig = {
  id: "openai-compatible-test",
  name: "Custom Chat Complete",
  enabled: true,
  provider: "openai-compatible",
  baseURL: "https://example.com/v1/",
  model,
} satisfies ProtocolCompatibleLLMProviderConfig

const openResponsesConfig = {
  id: "open-responses-test",
  name: "Custom Responses",
  enabled: true,
  provider: "open-responses",
  url: "https://example.com/v1/responses",
  model,
} satisfies ProtocolCompatibleLLMProviderConfig

describe("getProviderModelsURL", () => {
  it("appends models to an OpenAI-compatible API root", () => {
    expect(getProviderModelsURL(openAICompatibleConfig)).toBe("https://example.com/v1/models")
  })

  it("replaces the final segment of a full Open Responses endpoint", () => {
    expect(getProviderModelsURL(openResponsesConfig)).toBe("https://example.com/v1/models")
  })

  it("preserves query parameters while removing fragments", () => {
    expect(
      getProviderModelsURL({
        ...openResponsesConfig,
        url: "https://example.com/custom/responses/?api-version=2026-01-01#ignored",
      }),
    ).toBe("https://example.com/custom/models?api-version=2026-01-01")
  })

  it("preserves OpenAI-compatible query parameters while removing fragments", () => {
    expect(
      getProviderModelsURL({
        ...openAICompatibleConfig,
        baseURL: "https://example.com/v1/?api-version=2026-01-01#ignored",
      }),
    ).toBe("https://example.com/v1/models?api-version=2026-01-01")
  })
})

describe("preset model discovery endpoints", () => {
  it("uses the OpenCode catalog for each billing service", async () => {
    const { DEFAULT_PROVIDER_CONFIG } = await import("@/utils/constants/providers")
    expect(getProviderModelsURL(DEFAULT_PROVIDER_CONFIG.opencode)).toBe(
      "https://opencode.ai/inference/v1/models",
    )
    expect(
      getProviderModelsURL({
        ...DEFAULT_PROVIDER_CONFIG.opencode,
        service: "go",
        baseURL: "https://opencode.ai/inference/go/openai/v1",
      }),
    ).toBe("https://opencode.ai/inference/go/v1/models")
    expect(
      getProviderModelsURL({
        ...DEFAULT_PROVIDER_CONFIG.opencode,
        baseURL: "https://opencode.ai/zen/v1",
      }),
    ).toBe("https://opencode.ai/zen/v1/models")
  })
  it("respects a user-supplied gateway and the local LM Studio root", async () => {
    const { DEFAULT_PROVIDER_CONFIG } = await import("@/utils/constants/providers")
    expect(
      getProviderModelsURL({
        ...DEFAULT_PROVIDER_CONFIG.opencode,
        baseURL: "https://gateway.example/v1?region=test",
      }),
    ).toBe("https://gateway.example/v1/models?region=test")
    expect(getProviderModelsURL(DEFAULT_PROVIDER_CONFIG.lmstudio)).toBe(
      "http://127.0.0.1:1234/v1/models",
    )
  })
})
