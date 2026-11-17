import type { APIProviderTypes } from "@/types/config/provider"

export function providerRequiresApiKey(provider: APIProviderTypes): boolean {
  return !["deeplx", "ollama", "lmstudio"].includes(provider)
}
