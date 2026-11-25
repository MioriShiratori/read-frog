// @vitest-environment jsdom

import type { TranslationOnlySwapRecord } from "../../core/translation-state"
import { afterEach, beforeEach, expect, it } from "vitest"
import {
  isTranslationOnlySwapRecordCurrent,
  wasCharacterDataChangeExtensionDriven,
} from "../../core/translation-state"
import { setupOriginalTextHover } from "../original-text-hover"
import {
  registerFallbackOriginalHover,
  registerInPlaceOriginalHover,
} from "../translation-only-hover"

let controller: ReturnType<typeof setupOriginalTextHover>
function hover(element: Element) {
  element.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, composed: true }))
}
function leave(element: Element) {
  element.dispatchEvent(new MouseEvent("mouseout", { bubbles: true, composed: true }))
}
function recordFor(p: HTMLElement): TranslationOnlySwapRecord {
  return {
    walkId: "hover",
    runNodes: [p],
    expectedRunText: p.textContent,
    items: [
      { node: p.firstChild as Text, originalValue: "Original source", translatedValue: "译文" },
    ],
    attributeItems: [
      { element: p, name: "title", originalValue: "Original title", translatedValue: "译文标题" },
      { element: p, name: "aria-label", originalValue: null, translatedValue: "译文标签" },
    ],
  }
}
beforeEach(() => {
  document.body.innerHTML = '<p title="译文标题" aria-label="译文标签">译文</p>'
  controller = setupOriginalTextHover(document, true)
})
afterEach(() => controller.dispose())

it("keeps observer expectations current and marks both directions as extension writes", () => {
  const p = document.querySelector("p")!
  const record = recordFor(p)
  const release = registerInPlaceOriginalHover(record)
  hover(p)
  expect(p.textContent).toBe("Original source")
  expect(p.title).toBe("Original title")
  expect(p).not.toHaveAttribute("aria-label")
  expect(isTranslationOnlySwapRecordCurrent(record)).toBe(true)
  expect(wasCharacterDataChangeExtensionDriven(p.firstChild!)).toBe(true)
  leave(p)
  expect(p.textContent).toBe("译文")
  expect(p.title).toBe("译文标题")
  expect(p).toHaveAttribute("aria-label", "译文标签")
  expect(isTranslationOnlySwapRecordCurrent(record)).toBe(true)
  expect(wasCharacterDataChangeExtensionDriven(p.firstChild!)).toBe(true)
  release()
})

it("preserves site edits made during hover and leaves the run stale for repair", () => {
  const p = document.querySelector("p")!
  const record = recordFor(p)
  registerInPlaceOriginalHover(record)
  hover(p)
  p.firstChild!.textContent = "New site text"
  p.title = "New site title"
  leave(p)
  expect(p.textContent).toBe("New site text")
  expect(p.title).toBe("New site title")
  expect(isTranslationOnlySwapRecordCurrent(record)).toBe(false)
})

it("declines a stale run before hover and leaves disconnected text and attributes alone on exit", () => {
  const p = document.querySelector("p")!
  const record = recordFor(p)
  registerInPlaceOriginalHover(record)
  p.firstChild!.textContent = "New site text"
  hover(p)
  expect(p.textContent).toBe("New site text")
  leave(p)
  p.firstChild!.textContent = "译文"
  hover(p)
  const originalNode = p.firstChild!
  p.remove()
  leave(document.body)
  expect(originalNode.textContent).toBe("Original source")
  expect(p.title).toBe("Original title")
})

it("does not reclaim fallback originals already reattached by the site", () => {
  const wrapper = document.querySelector("p")!
  const original = document.createTextNode("Original")
  registerFallbackOriginalHover(wrapper, [original])
  document.body.append(original)
  hover(wrapper)
  expect(wrapper.textContent).toBe("译文")
  expect(original.parentNode).toBe(document.body)
})

it.each(["text", "identity"] as const)(
  "does not overwrite a %s edit inside fallback originals",
  (change) => {
    const wrapper = document.querySelector("p")!
    const original = document.createTextNode("Original")
    registerFallbackOriginalHover(wrapper, [original])
    hover(wrapper)
    if (change === "text") original.data = "Host edit"
    else original.replaceWith(document.createTextNode("Original"))
    leave(wrapper)
    expect(wrapper.textContent).toBe(change === "text" ? "Host edit" : "Original")
  },
)
