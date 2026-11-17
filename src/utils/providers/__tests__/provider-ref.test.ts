import type { PromptableProviderRef } from "../provider-ref"
import { describe, expect, expectTypeOf, it } from "vitest"
import { DEFAULT_CONFIG } from "@/utils/constants/config"
import { DEFAULT_PROVIDER_CONFIG } from "@/utils/constants/providers"
import {
  canProviderRefGenerateText,
  getProviderCacheIdentity,
  resolvePageTranslationProvider,
  serializeProviderRef,
} from "../provider-ref"
import {
  getSelectableProvidersForCapability,
  resolveProviderRefForCapability,
} from "../provider-registry"

const providers = [DEFAULT_PROVIDER_CONFIG.openai, DEFAULT_PROVIDER_CONFIG["microsoft-translate"]]

describe("configured provider resolution", () => {
  it("keeps translation services usable without an account", () => {
    const config = structuredClone(DEFAULT_CONFIG)
    config.providersConfig = providers
    config.pageTranslation.providerId = DEFAULT_PROVIDER_CONFIG["microsoft-translate"].id
    const ref = serializeProviderRef(resolvePageTranslationProvider(config))
    expect(ref.config).toEqual(DEFAULT_PROVIDER_CONFIG["microsoft-translate"])
    expect(canProviderRefGenerateText(ref)).toBe(false)
  })

  it("never synthesizes an official provider for old configuration IDs", () => {
    expect(
      resolveProviderRefForCapability("pageTranslation", providers, "read-frog-free-ai"),
    ).toBeNull()
    const options = getSelectableProvidersForCapability("customAction", providers)
    expect(options.map((provider) => provider.id)).toEqual([DEFAULT_PROVIDER_CONFIG.openai.id])
  })

  it("preserves model and generation settings in the transported cache snapshot", () => {
    const provider = resolveProviderRefForCapability(
      "customAction",
      providers,
      DEFAULT_PROVIDER_CONFIG.openai.id,
    )!
    const ref = serializeProviderRef(provider)
    expectTypeOf(ref).toEqualTypeOf<PromptableProviderRef>()
    expect(ref.config).toBe(provider.config)
    expect(getProviderCacheIdentity(ref)).toBe(JSON.stringify(provider.config))
    const changed = { ...ref, config: { ...ref.config, apiKey: "different-key" } }
    expect(getProviderCacheIdentity(changed)).not.toBe(getProviderCacheIdentity(ref))
  })

  it("excludes disabled providers from selectors and rejects translate-only custom actions", () => {
    const disabled = { ...DEFAULT_PROVIDER_CONFIG.openai, enabled: false }
    expect(getSelectableProvidersForCapability("customAction", [disabled])).toEqual([])
    expect(
      resolveProviderRefForCapability(
        "customAction",
        providers,
        DEFAULT_PROVIDER_CONFIG["microsoft-translate"].id,
      ),
    ).toBeNull()
  })
})
