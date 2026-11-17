// @vitest-environment jsdom
import type { Config } from "@/types/config/config"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { toastManager } from "@/components/ui/base-ui/toast"
import { DEFAULT_CONFIG } from "@/utils/constants/config"
import { DEFAULT_PROVIDER_CONFIG } from "@/utils/constants/providers"
import { validateTranslationConfigAndToast } from "../translate-text"

vi.mock("@/components/ui/base-ui/toast", () => ({
  toastManager: { add: vi.fn<typeof toastManager.add>() },
}))
beforeEach(() => vi.clearAllMocks())

function configFor(
  provider: "lmstudio" | "ollama" | "deeplx" | "deepseek",
  apiKey = "",
): Pick<Config, "providersConfig" | "pageTranslation" | "language"> {
  const target = { ...DEFAULT_PROVIDER_CONFIG[provider], apiKey }
  return {
    providersConfig: [
      ...DEFAULT_CONFIG.providersConfig.filter((item) => item.id !== target.id),
      target,
    ],
    pageTranslation: { ...DEFAULT_CONFIG.pageTranslation, providerId: target.id },
    language: { ...DEFAULT_CONFIG.language, sourceCode: "en", targetCode: "ja" },
  }
}

describe("page translation provider precheck", () => {
  it.each(["lmstudio", "ollama", "deeplx"] as const)(
    "allows keyless %s to start page translation",
    (provider) => {
      expect(validateTranslationConfigAndToast(configFor(provider))).toBe(true)
      expect(toastManager.add).not.toHaveBeenCalled()
    },
  )
  it("still requires a nonempty key from a provider that authenticates with one", () => {
    expect(validateTranslationConfigAndToast(configFor("deepseek", "   "))).toBe(false)
    expect(toastManager.add).toHaveBeenCalled()
    expect(validateTranslationConfigAndToast(configFor("deepseek", "test-key"))).toBe(true)
  })
  it("retains the same-language guard for keyless providers", () => {
    const config = configFor("lmstudio")
    config.language.targetCode = "en"
    expect(validateTranslationConfigAndToast(config)).toBe(false)
    expect(toastManager.add).toHaveBeenCalled()
  })
})
