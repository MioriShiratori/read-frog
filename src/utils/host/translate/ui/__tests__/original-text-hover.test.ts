// @vitest-environment jsdom

import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { registerOriginalTextHover, setupOriginalTextHover } from "../original-text-hover"

let controller: ReturnType<typeof setupOriginalTextHover>
function hover(element: Element, options: MouseEventInit = {}) {
  element.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, composed: true, ...options }))
}
function leave(element: Element, options: MouseEventInit = {}) {
  element.dispatchEvent(new MouseEvent("mouseout", { bubbles: true, composed: true, ...options }))
}
function registerText(element: HTMLElement, original: string) {
  return registerOriginalTextHover([element], () => {
    const translated = element.textContent
    element.textContent = original
    return () => {
      element.textContent = translated
    }
  })
}
beforeEach(() => {
  document.body.innerHTML = '<p title="Site tooltip">译文 <a href="/">链接</a></p>'
  controller = setupOriginalTextHover(document, false)
})
afterEach(() => controller.dispose())

it("switches text in place on enter, restores on exit and never creates a tooltip", () => {
  const p = document.querySelector("p")!
  registerText(p, "Original text")
  hover(p)
  expect(p.textContent).toBe("译文 链接")
  controller.setEnabled(true)
  hover(p)
  expect(p.textContent).toBe("Original text")
  expect(p.title).toBe("Site tooltip")
  leave(p)
  expect(p.textContent).toBe("译文 链接")
  hover(p)
  controller.setEnabled(false)
  expect(p.textContent).toBe("译文 链接")
  hover(p)
  expect(p.textContent).toBe("译文 链接")
})

it("does not flicker when moving within nested elements registered for the same paragraph", () => {
  const p = document.querySelector("p")!
  const link = document.querySelector("a")!
  const show = vi.fn<() => () => void>(() => () => {})
  const release = registerOriginalTextHover([p, link, p], show)
  controller.setEnabled(true)
  hover(p)
  leave(p, { relatedTarget: link })
  hover(link)
  controller.setEnabled(true)
  expect(show).toHaveBeenCalledOnce()
  release()
  release()
  hover(p)
  expect(show).toHaveBeenCalledOnce()
})

it("keeps other previews sharing a parent active when one run is removed", () => {
  const p = document.querySelector("p")!
  const restores = [vi.fn<() => void>(), vi.fn<() => void>()]
  const first = registerOriginalTextHover([p], () => restores[0])
  const second = registerOriginalTextHover([p], () => restores[1])
  controller.setEnabled(true)
  hover(p)
  first()
  expect(restores[0]).toHaveBeenCalledOnce()
  expect(restores[1]).not.toHaveBeenCalled()
  second()
  hover(p)
  expect(restores[1]).toHaveBeenCalledOnce()
})

it("handles shadow-root translations and restores when hovering unrelated content or disposing", () => {
  const host = document.createElement("div")
  document.body.append(host)
  const shadow = host.attachShadow({ mode: "open" })
  const translated = document.createElement("span")
  translated.textContent = "影子树译文"
  shadow.append(translated)
  registerText(translated, '<script>alert("plain text")</script>')
  controller.setEnabled(true)
  hover(translated)
  expect(translated.textContent).toBe('<script>alert("plain text")</script>')
  expect(shadow.querySelector("script")).toBeNull()
  hover(host)
  expect(translated.textContent).toBe("影子树译文")
  hover(translated)
  controller.dispose()
  expect(translated.textContent).toBe("影子树译文")
  hover(translated)
  expect(translated.textContent).toBe("影子树译文")
})

it("holds the original hit area after text shrinks until the pointer actually leaves it", () => {
  const p = document.querySelector("p")!
  vi.spyOn(p, "getBoundingClientRect").mockReturnValue(new DOMRect(10, 10, 200, 100))
  registerText(p, "Short")
  controller.setEnabled(true)
  hover(p, { clientX: 100, clientY: 80 })
  leave(p, { clientX: 100, clientY: 80 })
  hover(document.body, { clientX: 100, clientY: 80 })
  expect(p.textContent).toBe("Short")
  p.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: 100, clientY: 80 }))
  expect(p.textContent).toBe("Short")
  document.body.dispatchEvent(
    new MouseEvent("mousemove", { bubbles: true, clientX: 100, clientY: 80 }),
  )
  expect(p.textContent).toBe("Short")
  document.body.dispatchEvent(
    new MouseEvent("mousemove", { bubbles: true, clientX: 400, clientY: 400 }),
  )
  expect(p.textContent).toBe("译文 链接")
})

it("supports a stale preview declining to modify host content", () => {
  const p = document.querySelector("p")!
  registerOriginalTextHover([p], () => undefined)
  controller.setEnabled(true)
  hover(p)
  leave(p)
  expect(p.textContent).toBe("译文 链接")
})

it("restores translations when the page loses focus or visibility", () => {
  const p = document.querySelector("p")!
  registerText(p, "Original")
  controller.setEnabled(true)
  hover(p)
  window.dispatchEvent(new Event("blur"))
  expect(p.textContent).toBe("译文 链接")
  hover(p)
  document.dispatchEvent(new Event("visibilitychange"))
  expect(p.textContent).toBe("译文 链接")
})

it("does not bounce between previews when shortening text moves another translated element under the pointer", () => {
  const p = document.querySelector("p")!
  const button = document.createElement("button")
  button.textContent = "按钮译文"
  document.body.append(button)
  vi.spyOn(p, "getBoundingClientRect").mockReturnValue(new DOMRect(10, 10, 200, 100))
  registerText(p, "Short")
  registerText(button, "Button original")
  controller.setEnabled(true)
  hover(p, { clientX: 100, clientY: 80 })
  leave(p, { clientX: 100, clientY: 80, relatedTarget: button })
  hover(button, { clientX: 100, clientY: 80 })
  expect(p.textContent).toBe("Short")
  expect(button.textContent).toBe("按钮译文")
  hover(button, { clientX: 400, clientY: 400 })
  expect(p.textContent).toBe("译文 链接")
  expect(button.textContent).toBe("Button original")
})
