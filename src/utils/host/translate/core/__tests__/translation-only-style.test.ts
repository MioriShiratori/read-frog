// @vitest-environment jsdom

import type { TranslationNodeStylePreset } from "@/types/config/translate"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { DEFAULT_CONFIG } from "@/utils/constants/config"
import { BLOCK_ATTRIBUTE, PARAGRAPH_ATTRIBUTE } from "@/utils/constants/dom-labels"
import { flushBatchedOperations } from "@/utils/host/dom/batch-dom"
import { removeAllTranslatedWrapperNodes } from "../../dom/translation-cleanup"
import { translateNodeTranslationOnlyMode } from "../translation-modes"

const { translate } = vi.hoisted(() => ({ translate: vi.fn<() => Promise<string>>() }))
vi.mock("@/utils/host/translate/translate-variants", () => ({ translateTextForPage: translate }))
vi.mock("@/utils/host/translate/filter-small-paragraph", () => ({
  shouldFilterSmallParagraph: async () => false,
}))
vi.mock("@/utils/host/translate/target-language-skip", () => ({
  shouldSkipAsTargetLanguage: async () => false,
}))

beforeEach(() => {
  removeAllTranslatedWrapperNodes()
  document.body.innerHTML = "<p>Some ordinary English text to translate.</p>"
  translate.mockReset().mockResolvedValue("这是一段中文译文。")
})
afterEach(() => {
  removeAllTranslatedWrapperNodes()
})

async function translateSource(preset: TranslationNodeStylePreset) {
  const source = document.querySelector("p")!
  source.setAttribute(BLOCK_ATTRIBUTE, "")
  source.setAttribute(PARAGRAPH_ATTRIBUTE, "")
  const config = structuredClone(DEFAULT_CONFIG)
  config.pageTranslation.mode = "translationOnly"
  config.pageTranslation.translationNodeStyle = { preset, isCustom: false, customCSS: null }
  await translateNodeTranslationOnlyMode([source], "style-test", config)
  flushBatchedOperations()
  return source
}

it.each(["dashedLine", "textColor", "blockquote"] as const)(
  "applies %s in place and removes it on restore",
  async (preset) => {
    const originalText = document.querySelector("p")!.firstChild
    const source = await translateSource(preset)
    expect(source.textContent).toBe("这是一段中文译文。")
    expect(source.firstChild).toBe(originalText)
    expect(source).toHaveAttribute("data-read-frog-custom-translation-style", preset)
    removeAllTranslatedWrapperNodes()
    expect(source.textContent).toBe("Some ordinary English text to translate.")
    expect(source).not.toHaveAttribute("data-read-frog-custom-translation-style")
    expect(source).not.toHaveAttribute("data-read-frog-translation-only-style")
  },
)

it("preserves nested elements, listeners and site-owned metadata through translation and restore", async () => {
  document.querySelector("p")!.innerHTML = '<button id="action">Open source</button> details'
  const source = document.querySelector("p")!
  source.setAttribute("data-read-frog-custom-translation-style", "weakened")
  const button = document.querySelector("button")!
  const click = vi.fn<() => void>()
  button.addEventListener("click", click)
  translate.mockResolvedValue('<button id="action">打开源码</button> 详情')
  await translateSource("textColor")
  expect(document.querySelector("button")).toBe(button)
  expect(button).toHaveAttribute("data-read-frog-custom-translation-style", "textColor")
  button.click()
  expect(click).toHaveBeenCalledOnce()
  removeAllTranslatedWrapperNodes()
  expect(source.textContent).toBe("Open source details")
  expect(source).toHaveAttribute("data-read-frog-custom-translation-style", "weakened")
  expect(button).not.toHaveAttribute("data-read-frog-custom-translation-style")
  expect(document.querySelector("button")).toBe(button)
})

it("styles the fallback output when translated HTML cannot be aligned with source nodes", async () => {
  document.querySelector("p")!.innerHTML =
    '<a href="/original">Some ordinary English text</a> to translate.'
  translate.mockResolvedValue('<a href="/different">无法原位对齐的译文。</a>')
  await translateSource("dashedLine")
  const wrapper = document.querySelector('[data-read-frog-translation-mode="translationOnly"]')
  expect(wrapper).toHaveAttribute("data-read-frog-custom-translation-style", "dashedLine")
  expect(wrapper).not.toHaveStyle({ display: "contents" })
  removeAllTranslatedWrapperNodes()
  expect(document.querySelector("p")!.textContent).toBe("Some ordinary English text to translate.")
})

it("leaves unchanged inline code metadata untouched", async () => {
  document.querySelector("p")!.innerHTML = "Use <code>invoke</code> here."
  const code = document.querySelector("code")!
  const original = code.outerHTML
  translate.mockResolvedValue("在这里使用 <code>invoke</code>。")
  await translateSource("textColor")
  expect(code.outerHTML).toBe(original)
  removeAllTranslatedWrapperNodes()
  expect(document.querySelector("p")!.textContent).toBe("Use invoke here.")
})
