import type { TranslationOnlySwapRecord } from "../core/translation-state"
import {
  isTranslationOnlySwapRecordCurrent,
  markExtensionDrivenCharacterData,
  refreshTranslationOnlySwapRecordExpectedText,
} from "../core/translation-state"
import { registerOriginalTextHover } from "./original-text-hover"

function switchRecord(record: TranslationOnlySwapRecord, original: boolean): void {
  const from = original ? "translatedValue" : "originalValue"
  const to = original ? "originalValue" : "translatedValue"
  for (const item of record.items) {
    if (!item.node.isConnected || item.node.data !== item[from]) continue
    markExtensionDrivenCharacterData(item.node, item[to])
    item.node.data = item[to]
  }
  for (const item of record.attributeItems) {
    if (!item.element.isConnected || item.element.getAttribute(item.name) !== item[from]) continue
    const value = item[to]
    if (value === null) item.element.removeAttribute(item.name)
    else item.element.setAttribute(item.name, value)
  }
}

export function registerInPlaceOriginalHover(record: TranslationOnlySwapRecord): () => void {
  const targets = record.items
    .filter((item) => item.originalValue !== item.translatedValue)
    .map((item) => item.node.parentElement)
    .filter((element) => element !== null)
  return registerOriginalTextHover(targets, () => {
    if (!isTranslationOnlySwapRecordCurrent(record)) return undefined
    switchRecord(record, true)
    refreshTranslationOnlySwapRecordExpectedText(record)
    return () => {
      const wasCurrent = isTranslationOnlySwapRecordCurrent(record)
      switchRecord(record, false)
      // A host edit during the preview must remain stale for the normal repair
      // pipeline; refreshing unconditionally would hide that edit from it.
      if (wasCurrent) refreshTranslationOnlySwapRecordExpectedText(record)
    }
  })
}

export function registerFallbackOriginalHover(
  wrapper: HTMLElement,
  originals: readonly ChildNode[],
): () => void {
  return registerOriginalTextHover([wrapper], () => {
    if (originals.some((node) => node.isConnected)) return undefined
    const translated = [...wrapper.childNodes]
    const originalText = originals.map((node) => node.textContent).join("")
    wrapper.replaceChildren(...originals)
    return () => {
      if (wrapper.textContent !== originalText) return
      if (originals.some((node, index) => wrapper.childNodes[index] !== node)) return
      wrapper.replaceChildren(...translated)
    }
  })
}
