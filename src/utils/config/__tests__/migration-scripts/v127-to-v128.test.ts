import { describe, expect, it } from "vitest"
import { configSchema } from "@/types/config/config"
import { providersConfigSchema } from "@/types/config/provider"
import { DEFAULT_CONFIG } from "@/utils/constants/config"
import { migrate } from "../../migration-scripts/v127-to-v128"

function legacyConfig() {
  const config = structuredClone(DEFAULT_CONFIG)
  config.pageTranslation.providerId = "old-provider"
  return {
    ...config,
    providersConfig: [
      ...config.providersConfig,
      {
        id: "old-provider",
        name: "My old endpoint",
        enabled: true,
        provider: "jalapenocloud",
        apiKey: "test-only",
        baseURL: "https://example.test/v1",
        model: { model: "GLM-5.3", isCustomModel: false, customModel: null },
        temperature: 0.4,
        headers: { "X-Custom": "keep" },
        providerOptions: { reasoningEffort: "none" },
      },
    ],
  }
}

describe("v127 to v128 retired-provider migration", () => {
  it("preserves credentials, settings, provider identity, and existing feature assignments", () => {
    const input = legacyConfig()
    const before = structuredClone(input)
    const output = configSchema.parse(migrate(input))
    expect(input).toEqual(before)
    expect(output.providersConfig.at(-1)).toEqual({
      ...input.providersConfig.at(-1),
      provider: "openai-compatible",
      model: { model: "use-custom-model", isCustomModel: true, customModel: "GLM-5.3" },
    })
    expect(output.pageTranslation.providerId).toBe("old-provider")
    expect(migrate(output)).toEqual(output)
  })
  it("preserves an IF API custom model and disabled state", () => {
    const input = legacyConfig()
    const old = input.providersConfig.at(-1)!
    Object.assign(old, {
      provider: "ifapi",
      enabled: false,
      model: { model: "gpt-6-luna", isCustomModel: true, customModel: "my-model" },
    })
    const output = migrate(input)
    expect(output.providersConfig.at(-1)).toMatchObject({
      provider: "openai-compatible",
      enabled: false,
      model: { customModel: "my-model" },
    })
  })
  it("accepts old stored providers before background migration, without exposing a retired runtime kind", () => {
    const input = legacyConfig()
    const output = providersConfigSchema.parse(input.providersConfig)
    expect(output.at(-1)).toEqual(migrate(input).providersConfig.at(-1))
  })
  it("does not modify existing Chat Completions or Responses configurations", () => {
    const input = {
      providersConfig: [
        { provider: "open-responses", id: "responses", url: "https://example.test/responses" },
        null,
      ],
    }
    expect(migrate(input)).toEqual(input)
    expect(migrate({})).toEqual({})
    expect(migrate({ providersConfig: "invalid" })).toEqual({ providersConfig: "invalid" })
  })
  it("keeps missing models unset for the editor to resolve", () => {
    expect(
      migrate({ providersConfig: [{ provider: "ifapi" }] }).providersConfig[0].model.customModel,
    ).toBeNull()
  })
  it.each([null, undefined, false, 1, "old", []])(
    "leaves non-object input for validation: %j",
    (input) => {
      expect(migrate(input)).toBe(input)
    },
  )
})
