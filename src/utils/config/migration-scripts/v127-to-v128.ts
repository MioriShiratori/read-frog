/** Frozen migration: `any` is deliberate for legacy JSON inputs and outputs. */
export function migrate(oldConfig: any): any {
  if (!oldConfig || typeof oldConfig !== "object" || Array.isArray(oldConfig)) return oldConfig
  const config = structuredClone(oldConfig)
  if (!Array.isArray(config.providersConfig)) return config
  config.providersConfig = config.providersConfig.map((provider: any) => {
    if (!provider || !["jalapenocloud", "ifapi"].includes(provider.provider)) return provider
    return {
      ...provider,
      provider: "openai-compatible",
      model: {
        model: "use-custom-model",
        isCustomModel: true,
        customModel: provider.model?.isCustomModel
          ? provider.model.customModel
          : (provider.model?.model ?? null),
      },
    }
  })
  return config
}
