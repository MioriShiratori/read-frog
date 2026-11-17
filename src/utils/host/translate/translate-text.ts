import type { LanguageTag, LangLevel } from "@read-frog/definitions"
import type { ParagraphDiagnosis } from "./paragraph-diagnosis"
import type { Config } from "@/types/config/config"
import type { TranslateProviderConfig } from "@/types/config/provider"
import type { TranslationTextFormat } from "@/types/config/translate"
import type { WebPagePromptContext } from "@/types/content"
import type { GlossaryFeatureKey } from "@/utils/glossary/features"
import type { MatchedTerm } from "@/utils/glossary/types"
import type { SerializableProviderRef } from "@/utils/providers/provider-ref"
import type { ResolvedProviderRef } from "@/utils/providers/provider-registry"
import { isSameLanguage, LANGUAGE_ENGLISH_NAMES } from "@read-frog/definitions"
import { toastManager } from "@/components/ui/base-ui/toast"
import { isAPIProviderConfig, isLLMProviderConfig } from "@/types/config/provider"
import { classifyResolvedProvider } from "@/utils/analytics-provider"
import { isNoTranslationSentinel } from "@/utils/constants/prompt"
import { detectLanguage } from "@/utils/content/language"
import { resolveGlossaryTerms } from "@/utils/glossary/active-matcher"
import { trackGlossaryUsed } from "@/utils/glossary/analytics"
import { i18n } from "@/utils/i18n"
import { createLogger } from "@/utils/logging/logger"
import { getTranslatePrompt } from "@/utils/prompts/translate"
import { providerRequiresApiKey } from "@/utils/providers/api-key"
import { serializeProviderRef } from "@/utils/providers/provider-ref"
import { resolveProviderRefForCapability } from "@/utils/providers/provider-registry"
import { TranslationCancelledError } from "@/utils/request/cancellation"
import { Sha256Hex } from "../../hash"
import { sendMessage } from "../../message"
import { getInMemoryTranslation, storeInMemoryTranslation } from "./in-memory-translation-cache"
import { prepareTranslationText } from "./text-preparation"
import { getPageTranslationSessionId } from "./translation-session"

const log = createLogger("host/translate/translate-text")

/**
 * Minimum text length before a skip decision is attempted at all. Deliberately
 * below the general threshold, to catch short phrases like "Bonjour!" or
 * "こんにちは".
 *
 * Left at 10 even though detection is now franc-only. Raising it looks right
 * for Latin script — franc on ten characters is close to a coin flip there —
 * but this counts characters, and ten characters of Han, kana or Hangul is
 * plenty for franc precisely because the script alone is near-decisive. A flat
 * character count cannot express that difference, so tuning it needs a
 * script-aware rule rather than a bigger number.
 */
export const MIN_LENGTH_FOR_SKIP_LANGUAGE_DETECTION = 10

export async function shouldSkipByLanguage(
  text: string,
  skipLanguages: LanguageTag[],
): Promise<boolean> {
  const detectedLang = await detectLanguage(text, {
    minLength: MIN_LENGTH_FOR_SKIP_LANGUAGE_DETECTION,
    enableLLM: false,
  })

  if (!detectedLang) {
    return false
  }

  return skipLanguages.some((language) => isSameLanguage(language, detectedLang))
}

export function normalizePromptContextValue(
  value: string | null | undefined,
): string | null | undefined {
  if (value === null || value === undefined) {
    return value
  }
  return value.trim() === "" ? null : value
}

function normalizeWebPagePromptContext(
  webPageContext?: WebPagePromptContext,
): WebPagePromptContext | undefined {
  if (!webPageContext) {
    return undefined
  }

  return {
    webTitle: normalizePromptContextValue(webPageContext.webTitle),
    webDescription: normalizePromptContextValue(webPageContext.webDescription),
    webContent: normalizePromptContextValue(webPageContext.webContent),
    webSummary: normalizePromptContextValue(webPageContext.webSummary),
  }
}

async function buildWebPageHashComponents(
  text: string,
  providerRef: SerializableProviderRef,
  partialLangConfig: { sourceCode: LanguageTag | "auto"; targetCode: LanguageTag },
  enableAIContentAware: boolean,
  textFormat: TranslationTextFormat,
  preserveLineBreaks: boolean,
  glossaryTerms: readonly MatchedTerm[],
  webPageContext?: WebPagePromptContext,
): Promise<string[]> {
  const preparedText = prepareTranslationText(text)
  const normalizedWebPageContext = normalizeWebPagePromptContext(webPageContext)
  const providerConfig = providerRef.config
  const providerHashIdentity = providerRef.config
  const hashComponents = [
    preparedText,
    JSON.stringify(providerHashIdentity),
    partialLangConfig.sourceCode,
    partialLangConfig.targetCode,
  ]

  if (providerConfig && !isLLMProviderConfig(providerConfig)) {
    // The provider request depends on the text format (escaping / textType), so
    // cache entries must too. This component also orphans entries cached before
    // the format-aware pipeline existed, which could hold corrupted output.
    hashComponents.push(`textFormat:${textFormat}`)
    // Pushed only when the flag actually changes the provider request —
    // today that is Google alone — so cache entries written before the flag
    // existed stay valid and identical Microsoft/DeepL requests are not
    // fragmented. Flagged Google requests get fresh entries (any old
    // collapsed-line output for the same text is orphaned rather than
    // reused).
    if (preserveLineBreaks && providerConfig.provider === "google-translate") {
      hashComponents.push("preserveLineBreaks:true")
    }
    return hashComponents
  }

  const targetLangName = LANGUAGE_ENGLISH_NAMES[partialLangConfig.targetCode]
  // The terms are passed in rather than resolved here, so the prompt this hash
  // is taken over is built from exactly the terms the request will carry.
  const { systemPrompt, prompt } = await getTranslatePrompt(targetLangName, preparedText, {
    isBatch: true,
    context: normalizedWebPageContext,
    glossaryTerms,
  })
  hashComponents.push(systemPrompt, prompt)
  hashComponents.push(
    enableAIContentAware ? "enableAIContentAware=true" : "enableAIContentAware=false",
  )

  if (enableAIContentAware && normalizedWebPageContext) {
    if (normalizedWebPageContext.webTitle) {
      hashComponents.push(`webTitle:${normalizedWebPageContext.webTitle}`)
    }
    if (normalizedWebPageContext.webDescription) {
      hashComponents.push(`webDescription:${normalizedWebPageContext.webDescription}`)
    }
    if (normalizedWebPageContext.webContent) {
      // Use a substring hash to avoid huge hash inputs while still differentiating contexts.
      hashComponents.push(`webContent:${normalizedWebPageContext.webContent.slice(0, 1000)}`)
    }
    if (normalizedWebPageContext.webSummary) {
      hashComponents.push(`webSummary:${normalizedWebPageContext.webSummary}`)
    }
  }

  return hashComponents
}

export interface TranslateTextOptions {
  text: string
  langConfig: {
    sourceCode: LanguageTag | "auto"
    targetCode: LanguageTag
    level: LangLevel
  }
  providerConfig: ResolvedProviderRef<TranslateProviderConfig>
  enableAIContentAware?: boolean
  extraHashTags?: string[]
  webPageContext?: WebPagePromptContext
  textFormat?: TranslationTextFormat
  // Source line breaks are semantic — see the enqueueTranslateRequest field.
  preserveLineBreaks?: boolean
  // Page-translation session id used for cancellation scoping. Deliberately
  // NOT part of the cache hash — cache identity must not vary per session.
  sessionId?: string
  forceRetranslation?: boolean
  /**
   * Whether the user's glossary is switched on. Supplied by the caller, which
   * already holds the config, rather than re-read here per paragraph — the same
   * arrangement as `enableAIContentAware`.
   */
  glossaryEnabled?: boolean
  /** The feature applying the glossary and reporting usage. */
  feature: GlossaryFeatureKey
  /** Page translation: told when the answer is empty, and why. */
  diagnosis?: ParagraphDiagnosis
}

/**
 * Core translation function — pure, zero config fetching.
 * All dependencies must be provided explicitly.
 */
export async function translateTextCore(options: TranslateTextOptions): Promise<string> {
  const {
    text,
    langConfig,
    providerConfig,
    enableAIContentAware = false,
    extraHashTags = [],
    webPageContext,
    textFormat = "plain",
    preserveLineBreaks = false,
    sessionId,
    forceRetranslation = false,
    glossaryEnabled = false,
    feature,
    diagnosis,
  } = options

  const preparedText = prepareTranslationText(text)
  if (preparedText === "") {
    diagnosis?.untranslated("noProse")
    return ""
  }

  if (sessionId !== undefined && getPageTranslationSessionId() !== sessionId) {
    throw new TranslationCancelledError(sessionId)
  }

  const normalizedWebPageContext = normalizeWebPagePromptContext(webPageContext)
  const providerRef = serializeProviderRef(providerConfig)

  // Resolved ONCE, here, where `location.href` says which glossaries apply.
  // The same list feeds the cache hash and travels with the request, so the
  // prompt the hash describes is the prompt the background builds — it serves
  // every tab at once and could not scope this by itself.
  //
  // The revision travels with it because a batch can hold paragraphs resolved
  // either side of an edit made while this page was still translating, and it
  // is the only thing that tells the background which wording is the newer one
  // (see `mergeBatchGlossaryTerms`).
  const { terms: glossaryTerms, revision: glossaryRevision } = await resolveGlossaryTerms(
    preparedText,
    glossaryEnabled,
    langConfig.targetCode,
  )
  // Covers page, input and pure-translate-provider selection runs, which all
  // enter here; the two prompt-building selection paths and subtitles resolve
  // their own terms and report at their own resolve sites.
  trackGlossaryUsed(
    feature,
    glossaryTerms,
    langConfig.targetCode,
    classifyResolvedProvider(providerConfig),
  )

  const hashComponents = await buildWebPageHashComponents(
    preparedText,
    providerRef,
    { sourceCode: langConfig.sourceCode, targetCode: langConfig.targetCode },
    enableAIContentAware,
    textFormat,
    preserveLineBreaks,
    glossaryTerms,
    normalizedWebPageContext,
  )

  // Add extra hash tags for cache differentiation
  hashComponents.push(...extraHashTags)

  // Final gate before dispatch: if the page-translation session that owned
  // this request has ended (or been replaced) while we were preparing it,
  // abort instead of enqueueing. Sending now would either be unscoped (if the
  // id had gone null) or re-populate the queue AFTER the session's cancel
  // message already drained it — both defeat cancellation (#1881). Callers on
  // the page path swallow this error; input/selection requests carry no
  // sessionId and skip the gate entirely. The gate must also precede the
  // memory-tier read below: a cancelled session must not keep painting
  // translations out of memory.
  if (sessionId !== undefined && getPageTranslationSessionId() !== sessionId) {
    throw new TranslationCancelledError(sessionId)
  }

  const hash = Sha256Hex(...hashComponents)

  // In-tab memory tier over the background cache, same hash identity.
  // Virtualized pages (X articles/timelines) destroy and recreate paragraph
  // nodes on scroll; the recreated nodes re-enter this pipeline for text the
  // tab already translated, and paying the message round trip again makes the
  // page visibly re-translate paragraph by paragraph. Scoped to
  // page-translation runs (sessionId) so input/selection behavior is
  // untouched; forceRetranslation bypasses the read exactly like it bypasses
  // the background cache, but its fresh result still lands in the store below.
  if (sessionId !== undefined && !forceRetranslation) {
    const memoryHit = getInMemoryTranslation(hash)
    if (memoryHit !== undefined) {
      return toDisplayedResult(memoryHit, diagnosis)
    }
  }

  const result = await sendMessage("enqueueTranslateRequest", {
    text: preparedText,
    langConfig,
    providerRef,
    scheduleAt: Date.now(),
    hash,
    textFormat,
    preserveLineBreaks,
    webTitle: normalizedWebPageContext?.webTitle,
    webDescription: normalizedWebPageContext?.webDescription,
    webContent: normalizedWebPageContext?.webContent,
    webSummary: normalizedWebPageContext?.webSummary,
    sessionId,
    forceRetranslation,
    glossaryTerms,
    glossaryRevision,
  })
  if (sessionId !== undefined) {
    // Raw result, sentinel included, so a "no translation needed" verdict is
    // remembered too; the mapping below stays the single mapping point.
    storeInMemoryTranslation(hash, result)
  }
  // The sentinel must be mapped here and only here: every batch-pipeline
  // consumer (page paragraphs, document title, input translation, selection
  // toolbar standard path) routes through this function and already handles
  // "" gracefully. Mapping earlier — in the background — would fall out of
  // the truthy-only cache write and re-hit the provider on every request.
  return toDisplayedResult(result, diagnosis)
}

/** The one place the "no translation needed" sentinel becomes "" (see above). */
function toDisplayedResult(result: string, diagnosis: ParagraphDiagnosis | undefined): string {
  if (isNoTranslationSentinel(result)) {
    diagnosis?.untranslated("noTranslationNeeded")
    return ""
  }
  if (!result.trim()) diagnosis?.untranslated("emptyResult")
  return result
}

export function validateTranslationConfigAndToast(
  config: Pick<Config, "providersConfig" | "pageTranslation" | "language">,
): boolean {
  const { providersConfig, pageTranslation: translateConfig, language: languageConfig } = config
  const provider = resolveProviderRefForCapability(
    "pageTranslation",
    providersConfig,
    translateConfig.providerId,
  )
  if (!provider) {
    return false
  }

  if (
    languageConfig.sourceCode !== "auto" &&
    isSameLanguage(languageConfig.sourceCode, languageConfig.targetCode)
  ) {
    toastManager.add({ type: "error", title: i18n.t("translation.sameLanguage") })
    log.info("Page translation not started: source and target language are the same")
    return false
  }

  // check if the API key is configured
  if (
    isAPIProviderConfig(provider.config) &&
    !provider.config.apiKey?.trim() &&
    providerRequiresApiKey(provider.config.provider)
  ) {
    toastManager.add({ type: "error", title: i18n.t("noAPIKeyConfig.warning") })
    log.info("Page translation not started: the provider has no API key")
    return false
  }

  return true
}
