import type { APIProviderConfig } from "@/types/config/provider"

export const OPENCODE_BASE_URLS = {
  "pay-as-you-go": "https://opencode.ai/inference/openai/v1",
  go: "https://opencode.ai/inference/go/openai/v1",
} as const
type CustomProviderProtocol = "chat-completions" | "responses"

function changeEndpoint(url: string, responses: boolean): string {
  const parsed = new URL(url)
  const path = parsed.pathname.replace(/\/+$/, "")
  parsed.pathname = responses ? `${path}/responses` : path.replace(/\/responses$/, "")
  return parsed.toString()
}

export function switchCustomProviderProtocol(
  config: APIProviderConfig,
  protocol: CustomProviderProtocol,
): APIProviderConfig {
  if (config.provider === "openai-compatible" && protocol === "responses") {
    const { baseURL, ...shared } = config
    return { ...shared, provider: "open-responses", url: changeEndpoint(baseURL, true) }
  }
  if (config.provider === "open-responses" && protocol === "chat-completions") {
    const { url, ...shared } = config
    return { ...shared, provider: "openai-compatible", baseURL: changeEndpoint(url, false) }
  }
  return config
}
