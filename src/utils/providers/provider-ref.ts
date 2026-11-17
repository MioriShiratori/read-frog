import type { ResolvedProviderRef } from "./provider-registry"
import type { Config } from "@/types/config/config"
import type { LLMProviderConfig, TranslateProviderConfig } from "@/types/config/provider"
import { isLLMProviderConfig } from "@/types/config/provider"
import { resolveProviderRefForCapability } from "./provider-registry"

/** Snapshot of the provider used for transport and translation cache identity. */
export interface SerializableProviderRef {
  kind: "local"
  config: TranslateProviderConfig
}
export interface PromptableProviderRef {
  kind: "local"
  config: LLMProviderConfig
}

export function resolvePageTranslationProvider(
  config: Config,
): ResolvedProviderRef<TranslateProviderConfig> {
  const resolved = resolvePageTranslationProviderOrNull(config)
  if (!resolved)
    throw new Error(`No page translation provider for id "${config.pageTranslation.providerId}"`)
  return resolved
}
export function resolvePageTranslationProviderOrNull(
  config: Config,
): ResolvedProviderRef<TranslateProviderConfig> | null {
  return resolveProviderRefForCapability(
    "pageTranslation",
    config.providersConfig,
    config.pageTranslation.providerId,
  )
}
export function getProviderCacheIdentity(ref: SerializableProviderRef): string {
  return JSON.stringify(ref.config)
}
export function canProviderRefGenerateText(
  ref: SerializableProviderRef,
): ref is PromptableProviderRef {
  return isLLMProviderConfig(ref.config)
}
export function canResolvedProviderRefGenerateText(
  ref: ResolvedProviderRef,
): ref is ResolvedProviderRef<LLMProviderConfig> {
  return isLLMProviderConfig(ref.config)
}
export function serializeProviderRef(
  provider: ResolvedProviderRef<LLMProviderConfig>,
): PromptableProviderRef
export function serializeProviderRef(
  provider: ResolvedProviderRef<TranslateProviderConfig>,
): SerializableProviderRef
export function serializeProviderRef(
  provider: ResolvedProviderRef<TranslateProviderConfig>,
): SerializableProviderRef {
  return { kind: "local", config: provider.config }
}
