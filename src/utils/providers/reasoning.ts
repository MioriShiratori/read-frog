import type { AISDKReasoning, LLMProviderConfig } from "@/types/config/provider"
import { resolveModelId } from "./model-id"

// Portable levels are mapped by the SDK for native providers. Compatible endpoints
// pass them through, so known models that reject `none` need the same lower bound.
const MINIMUM_REASONING = [
  { pattern: /(?:^|\/)(?:gpt-6-astra|gpt-6\.1-sol)(?:-|$)/i, label: "low", effort: "low" },
  { pattern: /(?:^|\/)gpt-5(?:-mini|-nano)?(?:$|-\d{4})/i, label: "minimal", effort: "minimal" },
  { pattern: /(?:^|\/)o[134](?:-|$)/i, label: "low", effort: "low" },
  { pattern: /gpt-oss-(?:20b|120b)/i, label: "low", effort: "low" },
  { pattern: /claude-(?:opus-5-5|fable-5-1)/i, label: "adaptive / low" },
  { pattern: /claude-sonnet-5-5/i, label: "between_tools" },
  { pattern: /gemini-2\.5-pro/i, label: "thinkingBudget: 128" },
] satisfies { pattern: RegExp; label: string; effort?: AISDKReasoning }[]

export function getMinimumReasoning(config: LLMProviderConfig) {
  if ((config.reasoning ?? "none") !== "none") return undefined
  const model = resolveModelId(config.model) ?? ""
  return MINIMUM_REASONING.find((rule) => rule.pattern.test(model))
}

export function getTopLevelReasoning(config: LLMProviderConfig): AISDKReasoning {
  const minimum = getMinimumReasoning(config)
  return (minimum && "effort" in minimum ? minimum.effort : undefined) ?? config.reasoning ?? "none"
}
