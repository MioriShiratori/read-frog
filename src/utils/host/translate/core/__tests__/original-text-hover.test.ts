// @vitest-environment jsdom

import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { DEFAULT_CONFIG } from "@/utils/constants/config"
import { BLOCK_ATTRIBUTE, PARAGRAPH_ATTRIBUTE } from "@/utils/constants/dom-labels"
import { flushBatchedOperations } from "@/utils/host/dom/batch-dom"
import { removeAllTranslatedWrapperNodes } from "../../dom/translation-cleanup"
import { setupOriginalTextHover } from "../../ui/original-text-hover"
import { translateNodes } from "../translation-modes"

const { translate } = vi.hoisted(() => ({ translate: vi.fn<() => Promise<string>>() }))
vi.mock("@/utils/host/translate/translate-variants", () => ({ translateTextForPage: translate }))
vi.mock("@/utils/host/translate/filter-small-paragraph", () => ({
  shouldFilterSmallParagraph: async () => false,
}))
vi.mock("@/utils/host/translate/target-language-skip", () => ({
  shouldSkipAsTargetLanguage: async () => false,
}))
let controller: ReturnType<typeof setupOriginalTextHover>
beforeEach(() => {
  document.body.innerHTML =
    '<p title="Site tooltip">Read <a href="/source">this source</a> carefully.</p>'
  translate.mockReset().mockResolvedValue('请仔细阅读<a href="/source">此源码</a>。')
  controller = setupOriginalTextHover(document, false)
})
afterEach(() => {
  removeAllTranslatedWrapperNodes()
  controller.dispose()
})
function hover(element: Element) {
  element.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, composed: true }))
}
async function translateSource(mode: "bilingual" | "translationOnly") {
  const source = document.querySelector("p")!
  source.setAttribute(BLOCK_ATTRIBUTE, "")
  source.setAttribute(PARAGRAPH_ATTRIBUTE, "")
  const config = structuredClone(DEFAULT_CONFIG)
  config.pageTranslation.mode = mode
  await translateNodes([source], "hover-test", false, config)
  flushBatchedOperations()
  return source
}

it("does not add original hover to bilingual translations", async () => {
  translate.mockResolvedValue("请仔细阅读此源码。")
  const source = await translateSource("bilingual")
  const translated = source.querySelector(
    ".read-frog-translated-block-content, .read-frog-translated-inline-content",
  )!
  expect(translated).not.toBeNull()
  controller.setEnabled(true)
  hover(translated)
  expect(translated).not.toHaveAttribute("title")
  expect(source.firstChild!.textContent).toBe("Read ")
  removeAllTranslatedWrapperNodes()
  hover(source)
  expect(source.title).toBe("Site tooltip")
})

it("shows originals over in-place text and nested links, then removes metadata on restore", async () => {
  const originalLink = document.querySelector("a")!
  const originalText = document.querySelector("p")!.firstChild
  const source = await translateSource("translationOnly")
  expect(source.firstChild).toBe(originalText)
  expect(source.querySelector("a")).toBe(originalLink)
  hover(source)
  expect(source.title).toBe("Site tooltip")
  const translationCalls = translate.mock.calls.length
  controller.setEnabled(true)
  hover(originalLink)
  expect(originalLink.title).toBe("Read this source carefully.")
  expect(translate).toHaveBeenCalledTimes(translationCalls)
  removeAllTranslatedWrapperNodes()
  expect(originalLink).not.toHaveAttribute("title")
  expect(source.textContent).toBe("Read this source carefully.")
  hover(source)
  hover(originalLink)
  expect(source.title).toBe("Site tooltip")
  expect(originalLink).not.toHaveAttribute("title")
})

it("supports fallback HTML without displaying markup in the original tooltip", async () => {
  translate.mockResolvedValue('<a href="/different">无法对齐的译文。</a>')
  const source = await translateSource("translationOnly")
  const link = source.querySelector("a")!
  expect(link.getAttribute("href")).toBe("/different")
  controller.setEnabled(true)
  hover(link)
  expect(link.title).toBe("Read this source carefully.")
  removeAllTranslatedWrapperNodes()
  expect(source.textContent).toBe("Read this source carefully.")
  expect(source.querySelector("a")!.getAttribute("href")).toBe("/source")
})
