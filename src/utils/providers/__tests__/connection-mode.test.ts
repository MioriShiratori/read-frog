import { describe, expect, it } from "vitest"
import { DEFAULT_PROVIDER_CONFIG } from "@/utils/constants/providers"
import { switchCustomProviderProtocol } from "../connection-mode"

describe("custom provider protocol changes", () => {
  it("round-trips protocol-specific endpoints while preserving credentials and model settings", () => {
    const config = {
      ...DEFAULT_PROVIDER_CONFIG["openai-compatible"],
      id: "mine",
      name: "My endpoint",
      apiKey: "test-key",
      baseURL: "https://example.test/custom/v1/?region=local",
      temperature: 0.6,
      headers: { "X-Test": "1" },
      providerOptions: { reasoningEffort: "low" },
    }
    const responses = switchCustomProviderProtocol(config, "responses")
    expect(responses).toEqual({
      ...config,
      provider: "open-responses",
      baseURL: undefined,
      url: "https://example.test/custom/v1/responses?region=local",
    })
    expect(responses).not.toHaveProperty("baseURL")
    const chat = switchCustomProviderProtocol(responses, "chat-completions")
    expect(chat).toEqual({ ...config, baseURL: "https://example.test/custom/v1?region=local" })
    expect(chat).not.toHaveProperty("url")
    expect(config.baseURL).toBe("https://example.test/custom/v1/?region=local")
  })
  it("leaves an already-selected protocol or a built-in provider alone", () => {
    expect(
      switchCustomProviderProtocol(
        DEFAULT_PROVIDER_CONFIG["openai-compatible"],
        "chat-completions",
      ),
    ).toBe(DEFAULT_PROVIDER_CONFIG["openai-compatible"])
    expect(switchCustomProviderProtocol(DEFAULT_PROVIDER_CONFIG.openai, "responses")).toBe(
      DEFAULT_PROVIDER_CONFIG.openai,
    )
  })
})
