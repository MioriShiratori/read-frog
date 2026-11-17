/** Frozen migration: `any` is deliberate for legacy JSON inputs and outputs. */
export function migrate(oldConfig: any): any {
  if (!oldConfig || typeof oldConfig !== "object" || Array.isArray(oldConfig)) return oldConfig
  const config = structuredClone(oldConfig)
  if (config.floatingButton) delete config.floatingButton.clickAction
  if (Array.isArray(config.providersConfig)) {
    for (const provider of config.providersConfig) {
      if (provider?.model && provider.reasoning === undefined) provider.reasoning = "none"
    }
  }
  return config
}
