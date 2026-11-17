import type { SelectionToolbarCustomAction } from "@/types/config/selection-toolbar"
/** How much of a custom action's system prompt stands in for a description before it is cut. */
const SYSTEM_PROMPT_PREVIEW_WORDS = 8
/** Backstop for text the segmenter finds no word breaks in, and the budget when it is missing. */
const SYSTEM_PROMPT_PREVIEW_CHARS = 160
/** Separators left at the cut would sit awkwardly in front of the ellipsis. */
const TRAILING_SEPARATORS_RE = /[\s\p{P}]+$/u

/**
 * How far into `text` the preview may run, capped in words rather than characters: 80 characters
 * of Chinese carries several times the content of 80 characters of English, so a character budget
 * leaves previews wildly uneven between languages. The prompt's own language is unknown, so the
 * segmenter runs on the default locale — CJK is segmented from a dictionary either way.
 */
function findPreviewEnd(text: string): number {
  const capped = Math.min(text.length, SYSTEM_PROMPT_PREVIEW_CHARS)
  // Firefox only grew Intl.Segmenter in 125, well past the 112 this extension still supports.
  if (typeof Intl.Segmenter !== "function") return capped

  const segmenter = new Intl.Segmenter(undefined, { granularity: "word" })
  let words = 0
  for (const { index, isWordLike } of segmenter.segment(text)) {
    if (!isWordLike) continue
    words += 1
    if (words > SYSTEM_PROMPT_PREVIEW_WORDS) return Math.min(index, capped)
  }
  return capped
}

/**
 * Custom actions carry no description of their own, so the head of their system prompt stands
 * in for one. Newlines and markdown headings are collapsed to keep it to a single line.
 */
export function toSystemPromptPreview(action: SelectionToolbarCustomAction): string {
  const singleLine = (action.systemPrompt.trim() || action.prompt).replace(/\s+/g, " ").trim()
  const end = findPreviewEnd(singleLine)
  if (end >= singleLine.length) {
    return singleLine
  }
  return `${singleLine.slice(0, end).replace(TRAILING_SEPARATORS_RE, "")}…`
}
