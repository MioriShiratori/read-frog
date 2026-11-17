import type { ProtocolCompatibleLLMProviderConfig } from "@/types/config/provider"
import { isOpenResponsesLLMProviderConfig } from "@/types/config/provider"
import { getProviderConnectionURL } from "./connection-url"

function replaceLastPathSegment(url: URL, segment: string): void {
  const pathname = url.pathname.replace(/\/+$/, "")
  const parentPath = pathname.slice(0, pathname.lastIndexOf("/"))
  url.pathname = `${parentPath}/${segment}`
}

export function getProviderModelsURL(providerConfig: ProtocolCompatibleLLMProviderConfig): string {
  const url = new URL(getProviderConnectionURL(providerConfig))

  if (providerConfig.provider === "opencode" && url.hostname === "opencode.ai") {
    url.pathname = url.pathname.replace(/\/openai(?=\/v1\/?$)/, "")
  }
  if (isOpenResponsesLLMProviderConfig(providerConfig)) {
    replaceLastPathSegment(url, "models")
  } else {
    url.pathname = `${url.pathname.replace(/\/+$/, "")}/models`
  }

  url.hash = ""
  return url.toString()
}
