import { describe, expect, it } from "vitest"
import { configSchema } from "@/types/config/config"
import { isLLMProviderConfig } from "@/types/config/provider"
import { DEFAULT_CONFIG } from "@/utils/constants/config"
import { migrate } from "../../migration-scripts/v128-to-v129"

describe("v128 to v129 settings migration", () => {
  it("retains provider settings and assignments while defaulting missing reasoning and removing the old click action", () => {
    const input = {
      ...structuredClone(DEFAULT_CONFIG),
      floatingButton: { ...DEFAULT_CONFIG.floatingButton, clickAction: "panel" },
      providersConfig: DEFAULT_CONFIG.providersConfig.map((provider) =>
        isLLMProviderConfig(provider)
          ? { ...provider, reasoning: provider.provider === "openai" ? "high" : undefined }
          : provider,
      ),
    }
    const before = structuredClone(input)
    const migrated = migrate(input)
    expect(migrated).not.toHaveProperty("floatingButton.clickAction")
    const output = configSchema.parse(migrated)
    expect(input).toEqual(before)
    expect(output.floatingButton).toEqual(DEFAULT_CONFIG.floatingButton)
    for (const provider of output.providersConfig) {
      const original = before.providersConfig.find((item) => item.id === provider.id)!
      expect(provider).toEqual(
        isLLMProviderConfig(provider)
          ? { ...original, reasoning: provider.provider === "openai" ? "high" : "none" }
          : original,
      )
    }
    expect(output.pageTranslation).toEqual(input.pageTranslation)
    expect(output.selectionToolbar).toEqual(input.selectionToolbar)
    expect(migrate(output)).toEqual(output)
  })

  it.each([null, false, [], "invalid"])(
    "leaves malformed input %j for the config validator",
    (value) => {
      expect(migrate(value)).toEqual(value)
    },
  )

  it("handles partial configuration without mutating it", () => {
    expect(migrate({ providersConfig: null })).toEqual({ providersConfig: null })
  })
})
