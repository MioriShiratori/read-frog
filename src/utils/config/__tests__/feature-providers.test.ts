import { describe, expect, it } from "vitest"
import { DEFAULT_CONFIG } from "@/utils/constants/config"
import { DEFAULT_PROVIDER_CONFIG } from "@/utils/constants/providers"
import {
  computeLanguageDetectionFallbackAfterDeletion,
  computeProviderFallbacksAfterDeletion,
  computeSelectionToolbarCustomActionFallbacksAfterDeletion,
  findFeatureMissingProvider,
  resolveLanguageDetectionConfigForModeChange,
} from "../helpers"

const microsoft = DEFAULT_PROVIDER_CONFIG["microsoft-translate"]
const openai = DEFAULT_PROVIDER_CONFIG.openai
const deepseek = DEFAULT_PROVIDER_CONFIG.deepseek

describe("provider fallback without official services", () => {
  it("moves affected translation slots to a remaining enabled service", () => {
    const config = structuredClone(DEFAULT_CONFIG)
    config.pageTranslation.providerId = openai.id
    config.inputTranslation.providerId = openai.id
    expect(computeProviderFallbacksAfterDeletion(openai.id, config, [microsoft])).toEqual({
      pageTranslation: microsoft.id,
      inputTranslation: microsoft.id,
    })
    expect(findFeatureMissingProvider([], config)).toBe("pageTranslation")
    expect(findFeatureMissingProvider([microsoft], config)).toBeNull()
  })

  it("does not replace a deleted action provider with a translate-only service", () => {
    const config = structuredClone(DEFAULT_CONFIG)
    expect(
      computeSelectionToolbarCustomActionFallbacksAfterDeletion(openai.id, config, [microsoft]),
    ).toBeNull()
    const result = computeSelectionToolbarCustomActionFallbacksAfterDeletion(openai.id, config, [
      deepseek,
    ])
    expect(result?.builtInActions.dictionary.providerId).toBe(deepseek.id)
    expect(config.selectionToolbar.builtInActions.dictionary.providerId).toBe(openai.id)
  })

  it("only enables AI language detection when a configured LLM can run it", () => {
    expect(
      resolveLanguageDetectionConfigForModeChange({ mode: "basic" }, "llm", [microsoft]),
    ).toBeNull()
    expect(resolveLanguageDetectionConfigForModeChange({ mode: "basic" }, "llm", [openai])).toEqual(
      { mode: "llm", providerId: openai.id },
    )
    expect(
      resolveLanguageDetectionConfigForModeChange(
        { mode: "llm", providerId: openai.id },
        "basic",
        [],
      ),
    ).toEqual({ mode: "basic" })
  })

  it("keeps the selected detection model, or falls back when that provider is deleted", () => {
    const config = structuredClone(DEFAULT_CONFIG)
    config.languageDetection = { mode: "llm", providerId: deepseek.id }
    expect(
      resolveLanguageDetectionConfigForModeChange(config.languageDetection, "llm", [
        openai,
        deepseek,
      ]),
    ).toEqual(config.languageDetection)
    expect(computeLanguageDetectionFallbackAfterDeletion(deepseek.id, config, [openai])).toBe(
      openai.id,
    )
    expect(findFeatureMissingProvider([microsoft], config)).toBe("languageDetection")
  })
})
