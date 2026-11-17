import { describe, expect, it } from "vitest"
import { configSchema } from "@/types/config/config"
import { DEFAULT_CONFIG } from "@/utils/constants/config"
import { migrate } from "../../migration-scripts/v126-to-v127"

function legacyConfig() {
  const config = structuredClone(DEFAULT_CONFIG)
  config.pageTranslation.providerId = "read-frog-free-ai"
  config.videoSubtitles.providerId = "read-frog-advance-ai"
  config.inputTranslation.providerId = "read-frog-free-ai"
  config.selectionToolbar.features.translate.providerId = "read-frog-advance-ai"
  config.languageDetection = { mode: "llm", providerId: "read-frog-free-ai" }
  config.selectionToolbar.builtInActions.dictionary.providerId = "read-frog-free-ai"
  config.selectionToolbar.customActions = [
    {
      id: "my-action",
      name: "My action",
      icon: "tabler:book",
      providerId: "read-frog-advance-ai",
      systemPrompt: "Explain",
      prompt: "{{selection}}",
      outputSchema: [{ id: "term", name: "Term", type: "string", description: "" }],
    },
  ]
  config.translationHub.selectedProviderIds = [
    "read-frog-free-ai",
    "openai-default",
    "read-frog-advance-ai",
  ]
  return config
}

describe("v126 to v127 local-provider migration", () => {
  it("reassigns every removed provider and produces a valid config without mutating the original", () => {
    const input = legacyConfig()
    const before = structuredClone(input)
    const output = configSchema.parse(migrate(input))
    expect(input).toEqual(before)
    expect(output.pageTranslation.providerId).toBe("google-translate-default")
    expect(output.videoSubtitles.providerId).toBe(output.pageTranslation.providerId)
    expect(output.inputTranslation.providerId).toBe(output.pageTranslation.providerId)
    expect(output.selectionToolbar.features.translate.providerId).toBe(
      output.pageTranslation.providerId,
    )
    expect(output.languageDetection).toEqual({ mode: "basic" })
    const llm = output.providersConfig.find((provider) => "model" in provider && provider.enabled)!
    expect(output.selectionToolbar.builtInActions.dictionary.providerId).toBe(llm.id)
    expect(output.selectionToolbar.customActions[0]!.providerId).toBe(llm.id)
    expect(output.translationHub.selectedProviderIds).toEqual(["openai-default"])
  })

  it("removes cloud-note metadata but preserves prompts, fields, keys, and user provider choices", () => {
    const base = legacyConfig()
    const connection = { notebaseId: "private-cloud-table", mappings: [] }
    const input = {
      ...base,
      pageTranslation: { ...base.pageTranslation, providerId: "custom-user-provider" },
      selectionToolbar: {
        ...base.selectionToolbar,
        noteSuggestion: { enabled: true },
        builtInActions: {
          ...base.selectionToolbar.builtInActions,
          dictionary: {
            ...base.selectionToolbar.builtInActions.dictionary,
            notebaseConnection: connection,
          },
        },
        customActions: [
          { ...base.selectionToolbar.customActions[0]!, notebaseConnection: connection },
        ],
      },
    }
    const output = migrate(input)
    expect(output.pageTranslation.providerId).toBe("custom-user-provider")
    expect(output.selectionToolbar).not.toHaveProperty("noteSuggestion")
    expect(output.selectionToolbar.builtInActions.dictionary).not.toHaveProperty(
      "notebaseConnection",
    )
    expect(output.selectionToolbar.customActions[0]).not.toHaveProperty("notebaseConnection")
    expect(output.selectionToolbar.customActions[0].outputSchema).toEqual(
      input.selectionToolbar.customActions[0]!.outputSchema,
    )
    expect(output.providersConfig).toEqual(input.providersConfig)
    expect(migrate(output)).toEqual(output)
  })

  it("creates explicit configuration targets when a profile contains no local services", () => {
    const config = legacyConfig()
    config.providersConfig = []
    const output = configSchema.parse(migrate(config))
    expect(output.providersConfig.map((provider) => provider.id)).toEqual([
      "microsoft-translate-default",
      "openai-default",
    ])
    expect(output.selectionToolbar.customActions[0]!.providerId).toBe("openai-default")
    expect(output.pageTranslation.providerId).toBe("microsoft-translate-default")
  })

  it("reuses disabled defaults only when a removed provider needs a replacement", () => {
    const config = legacyConfig()
    config.providersConfig = DEFAULT_CONFIG.providersConfig
      .filter(
        (provider) => provider.provider === "openai" || provider.provider === "microsoft-translate",
      )
      .map((provider) => ({ ...provider, enabled: false }))
    const output = configSchema.parse(migrate(config))
    expect(output.providersConfig.every((provider) => provider.enabled)).toBe(true)
    expect(output.pageTranslation.providerId).toBe("microsoft-translate-default")
    expect(output.selectionToolbar.builtInActions.dictionary.providerId).toBe("openai-default")
    const untouched = structuredClone(DEFAULT_CONFIG)
    untouched.providersConfig = []
    expect(migrate(untouched).providersConfig).toEqual([])
  })

  it("does not overwrite user providers that happen to use the fallback IDs", () => {
    const input = legacyConfig()
    input.providersConfig = [
      {
        ...DEFAULT_CONFIG.providersConfig.find((provider) => provider.provider === "deepseek")!,
        id: "openai-default",
        name: "OpenAI",
        enabled: false,
      },
      {
        ...DEFAULT_CONFIG.providersConfig.find((provider) => provider.provider === "deepseek")!,
        id: "microsoft-translate-default",
        name: "Microsoft Translate",
        enabled: false,
      },
    ]
    for (const action of Object.values(input.selectionToolbar.builtInActions))
      action.providerId = "read-frog-free-ai"
    const output = configSchema.parse(migrate(input))
    expect(output.providersConfig.slice(0, 2)).toEqual(input.providersConfig)
    expect(output.pageTranslation.providerId).toBe("microsoft-translate-default-1")
    expect(output.selectionToolbar.builtInActions.dictionary.providerId).toBe("openai-default-1")
    expect(new Set(output.providersConfig.map((provider) => provider.id)).size).toBe(4)
    expect(new Set(output.providersConfig.map((provider) => provider.name)).size).toBe(4)
    expect(migrate(output)).toEqual(output)
  })

  it("cleans a partial toolbar when action collections are absent", () => {
    expect(migrate({ selectionToolbar: { noteSuggestion: { enabled: true } } })).toEqual({
      providersConfig: [],
      selectionToolbar: {},
    })
  })

  it.each([null, undefined, false, 1, "old", []])(
    "leaves invalid non-object input for the caller to validate: %j",
    (input) => {
      expect(migrate(input)).toBe(input)
    },
  )

  it("handles an incomplete legacy object without inventing unrelated preferences", () => {
    expect(migrate({})).toEqual({ providersConfig: [] })
    expect(
      migrate({ selectionToolbar: { builtInActions: { dictionary: null }, customActions: [] } }),
    ).toEqual({
      providersConfig: [],
      selectionToolbar: { builtInActions: { dictionary: null }, customActions: [] },
    })
  })
})
