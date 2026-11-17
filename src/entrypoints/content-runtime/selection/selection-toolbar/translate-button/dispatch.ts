import type { SelectionToolbarTranslateRequestSlice } from "../atoms"
import type { BackgroundTextStreamSnapshot, ThinkingSnapshot } from "@/types/background-stream"
import type { LLMProviderConfig, TranslateProviderConfig } from "@/types/config/provider"
import type { SelectionPromptContext } from "@/utils/prompts/selection-context"
import type { PromptableProviderRef } from "@/utils/providers/provider-ref"
import type {
  ResolvedProviderRef,
  SelectionTranslationProviderRef,
} from "@/utils/providers/provider-registry"
import { LANGUAGE_ENGLISH_NAMES } from "@read-frog/definitions"
import { isLLMProviderConfig, isTranslateProviderConfig } from "@/types/config/provider"
import { classifyProviderConfig } from "@/utils/analytics-provider"
import { streamBackgroundText } from "@/utils/content-script/background-stream-client"
import { resolveGlossaryTermsFromCache } from "@/utils/glossary/active-matcher"
import { trackGlossaryUsed } from "@/utils/glossary/analytics"
import { translateTextCore } from "@/utils/host/translate/translate-text"
import { getOrCreateWebPageContext } from "@/utils/host/translate/webpage-context"
import { getOrGenerateWebPageSummary } from "@/utils/host/translate/webpage-summary"
import { getTranslatePromptFromConfig } from "@/utils/prompts/translate"
import { resolveModelId } from "@/utils/providers/model-id"
import { getProviderOptionsWithOverride } from "@/utils/providers/options"
import { getTopLevelReasoning } from "@/utils/providers/reasoning"

export async function getSelectionWebPagePromptContext(
  summaryProviderRef: PromptableProviderRef | null,
  enableAIContentAware: boolean,
) {
  const webPageContext = await getOrCreateWebPageContext()
  if (!webPageContext) {
    return undefined
  }

  const webSummary = summaryProviderRef
    ? await getOrGenerateWebPageSummary(webPageContext, summaryProviderRef, enableAIContentAware)
    : null
  return {
    webTitle: webPageContext.webTitle,
    webDescription: webPageContext.webDescription,
    webContent: webPageContext.webContent,
    webSummary: webSummary ?? undefined,
  }
}

export async function translateWithTextStream({
  preparedText,
  providerId,
  providerConfig,
  translateRequest,
  selectionContext,
  onChunk,
  registerAbortController,
}: {
  preparedText: string
  providerId: string
  providerConfig: LLMProviderConfig
  translateRequest: SelectionToolbarTranslateRequestSlice
  /** The paragraph(s) the selection sits in; see utils/prompts/selection-context.ts. */
  selectionContext?: SelectionPromptContext
  onChunk: (data: BackgroundTextStreamSnapshot) => void
  registerAbortController: (abortController: AbortController) => void
}) {
  const targetLangName = LANGUAGE_ENGLISH_NAMES[translateRequest.language.targetCode]
  const modelName = resolveModelId(providerConfig.model)
  const reasoning = getTopLevelReasoning(providerConfig)
  const providerOptions = getProviderOptionsWithOverride(
    modelName ?? "",
    providerConfig.provider,
    providerConfig.providerOptions,
    reasoning,
  )
  const temperature = providerConfig.temperature
  const abortController = new AbortController()
  registerAbortController(abortController)

  const throwIfAborted = () => {
    if (abortController.signal.aborted) {
      throw new DOMException("aborted", "AbortError")
    }
  }

  const webPageContext = await getSelectionWebPagePromptContext(
    { kind: "local", config: providerConfig },
    translateRequest.enableAIContentAware,
  )
  throwIfAborted()

  // Read from the already-compiled matcher — no await on this path. See
  // `resolveGlossaryTermsFromCache`.
  const glossaryTerms = resolveGlossaryTermsFromCache(
    preparedText,
    translateRequest.glossaryEnabled,
    translateRequest.language.targetCode,
  )
  trackGlossaryUsed(
    "selectionTranslation",
    glossaryTerms,
    translateRequest.language.targetCode,
    classifyProviderConfig(providerConfig),
  )

  const { systemPrompt, prompt } = getTranslatePromptFromConfig(
    { customPromptsConfig: translateRequest.customPromptsConfig },
    targetLangName,
    preparedText,
    {
      ...(webPageContext
        ? {
            context: {
              webTitle: webPageContext.webTitle,
              webDescription: webPageContext.webDescription,
              webContent: webPageContext.webContent,
              webSummary: webPageContext.webSummary,
            },
          }
        : {}),
      glossaryTerms,
      selectionContext,
    },
  )

  const translatedText = await streamBackgroundText(
    {
      providerKind: "local",
      providerId,
      instructions: systemPrompt,
      prompt,
      providerOptions,
      reasoning,
      temperature,
    },
    {
      signal: abortController.signal,
      onChunk,
    },
  )

  return translatedText
}

export async function translateWithStandardProvider({
  text,
  provider,
  translateRequest,
}: {
  text: string
  provider: ResolvedProviderRef<TranslateProviderConfig>
  translateRequest: SelectionToolbarTranslateRequestSlice
}) {
  const webPageContext = await getSelectionWebPagePromptContext(
    null,
    translateRequest.enableAIContentAware,
  )
  const translatedText = await translateTextCore({
    text,
    langConfig: translateRequest.language,
    providerConfig: provider,
    feature: "selectionTranslation",
    enableAIContentAware: translateRequest.enableAIContentAware,
    glossaryEnabled: translateRequest.glossaryEnabled,
    extraHashTags: ["selectionTranslation"],
    webPageContext,
    // Selection.toString() only puts a newline where the page shows a line
    // break (a <br>, a new block, a pre-wrap newline), so every one is
    // structure. Google's transport collapses unprotected newlines, and on
    // the resulting run-on text its zh-TW model can stop mid-text (#2466).
    preserveLineBreaks: true,
  })

  return translatedText
}

/**
 * Why the configured provider cannot translate a selection right now, or
 * `null` when it can: the same prechecks the translate button makes before
 * it runs.
 */
export function checkSelectionTranslateProvider(
  provider: SelectionTranslationProviderRef | null,
): "providerUnavailable" | "providerDisabled" | null {
  if (!provider) return "providerUnavailable"
  if (!provider.config.enabled) return "providerDisabled"
  if (!isTranslateProviderConfig(provider.config)) {
    return "providerUnavailable"
  }
  return null
}

export async function translateSelection({
  preparedText,
  provider,
  translateRequest,
  selectionContext,
  onChunk,
  registerAbortController,
}: {
  preparedText: string
  provider: SelectionTranslationProviderRef
  translateRequest: SelectionToolbarTranslateRequestSlice
  selectionContext?: SelectionPromptContext
  onChunk?: (data: BackgroundTextStreamSnapshot) => void
  registerAbortController: (abortController: AbortController) => void
}): Promise<{ output: string; thinking: ThinkingSnapshot | null }> {
  const handleChunk = onChunk ?? (() => {})

  if (!isTranslateProviderConfig(provider.config)) {
    throw new Error("The configured provider cannot translate a selection.")
  }
  if (isLLMProviderConfig(provider.config)) {
    const providerConfig = provider.config
    return translateWithTextStream({
      preparedText,
      providerId: providerConfig.id,
      providerConfig,
      translateRequest,
      selectionContext,
      onChunk: handleChunk,
      registerAbortController,
    })
  }
  const output = await translateWithStandardProvider({
    text: preparedText,
    provider,
    translateRequest,
  })
  return { output, thinking: null }
}
