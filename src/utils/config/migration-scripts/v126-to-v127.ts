/** Frozen migration: `any` is deliberate at every legacy-JSON boundary in this file. */
const REMOVED_PROVIDERS = new Set(["read-frog-free-ai", "read-frog-advance-ai"])

function isRemovedProvider(slot: any): boolean {
  return REMOVED_PROVIDERS.has(slot?.providerId)
}

function unusedProviderValue(providers: any[], key: "id" | "name", base: string): string {
  let id = base
  for (let suffix = 1; providers.some((provider) => provider[key] === id); suffix++) {
    id = `${base}-${suffix}`
  }
  return id
}

function getActionFallback(providers: any[]): string {
  const configured = providers.find((provider) => provider.enabled && provider.model)
  if (configured) return configured.id

  const existing = providers.find((provider) => provider.provider === "openai")
  if (existing) {
    existing.enabled = true
    return existing.id
  }

  const fallback = {
    id: unusedProviderValue(providers, "id", "openai-default"),
    name: unusedProviderValue(providers, "name", "OpenAI"),
    enabled: true,
    provider: "openai",
    model: { model: "gpt-6-luna", isCustomModel: false, customModel: null },
  }
  providers.push(fallback)
  return fallback.id
}

function getTranslationFallback(providers: any[]): string {
  const existing = providers.find(
    (provider) =>
      provider.enabled && ["microsoft-translate", "google-translate"].includes(provider.provider),
  )
  if (existing) return existing.id

  const microsoft = providers.find((provider) => provider.provider === "microsoft-translate")
  if (microsoft) {
    microsoft.enabled = true
    return microsoft.id
  }
  const id = unusedProviderValue(providers, "id", "microsoft-translate-default")
  providers.push({
    id,
    name: unusedProviderValue(providers, "name", "Microsoft Translate"),
    enabled: true,
    provider: "microsoft-translate",
  })
  return id
}

function migrateActions(toolbar: any, providers: any[]): void {
  if (!toolbar) return
  delete toolbar.noteSuggestion
  const actions = [
    ...Object.values(toolbar.builtInActions ?? {}),
    ...(toolbar.customActions ?? []),
  ] as any[]
  const needsFallback = actions.some(isRemovedProvider)
  const fallback = needsFallback ? getActionFallback(providers) : undefined
  for (const action of actions) {
    if (!action || typeof action !== "object") continue
    if (isRemovedProvider(action)) action.providerId = fallback
    delete action.notebaseConnection
  }
}

export function migrate(oldConfig: any): any {
  if (!oldConfig || typeof oldConfig !== "object" || Array.isArray(oldConfig)) return oldConfig
  const config = structuredClone(oldConfig)
  const providers = Array.isArray(config.providersConfig) ? config.providersConfig : []
  config.providersConfig = providers

  const slots = [
    config.pageTranslation,
    config.videoSubtitles,
    config.inputTranslation,
    config.selectionToolbar?.features?.translate,
  ]
  if (slots.some(isRemovedProvider)) {
    const fallback = getTranslationFallback(providers)
    for (const slot of slots) if (isRemovedProvider(slot)) slot.providerId = fallback
  }
  if (isRemovedProvider(config.languageDetection)) config.languageDetection = { mode: "basic" }
  migrateActions(config.selectionToolbar, providers)
  if (Array.isArray(config.translationHub?.selectedProviderIds)) {
    config.translationHub.selectedProviderIds = config.translationHub.selectedProviderIds.filter(
      (id: string) => !REMOVED_PROVIDERS.has(id),
    )
  }
  return config
}
