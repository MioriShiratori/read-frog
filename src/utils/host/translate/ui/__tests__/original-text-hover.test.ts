// @vitest-environment jsdom

import { afterEach, beforeEach, expect, it } from "vitest"
import { registerOriginalTextHover, setupOriginalTextHover } from "../original-text-hover"

let controller: ReturnType<typeof setupOriginalTextHover>
function hover(element: Element) {
  element.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, composed: true }))
}
function leave(element: Element) {
  element.dispatchEvent(new MouseEvent("mouseout", { bubbles: true, composed: true }))
}
beforeEach(() => {
  document.body.innerHTML = '<p title="Site tooltip">译文 <a href="/">链接</a></p>'
  controller = setupOriginalTextHover(document, false)
})
afterEach(() => controller.dispose())

it("enables existing translations immediately without altering text or site titles after leaving", () => {
  const p = document.querySelector("p")!
  const text = p.firstChild
  registerOriginalTextHover([p], "Original text")
  hover(p)
  expect(p.title).toBe("Site tooltip")
  controller.setEnabled(true)
  hover(p)
  expect(p.title).toBe("Original text")
  expect(p.firstChild).toBe(text)
  expect(p.textContent).toBe("译文 链接")
  leave(p)
  expect(p.title).toBe("Site tooltip")
  hover(p)
  controller.setEnabled(false)
  expect(p.title).toBe("Site tooltip")
  hover(p)
  expect(p.title).toBe("Site tooltip")
})

it("selects the closest source and preserves nested link interaction and host title changes", () => {
  const p = document.querySelector("p")!
  const link = document.querySelector("a")!
  registerOriginalTextHover([p], "Full original")
  const release = registerOriginalTextHover([link], "Original link")
  controller.setEnabled(true)
  hover(p)
  hover(link)
  expect(p.title).toBe("Site tooltip")
  expect(link.title).toBe("Original link")
  expect(link.getAttribute("href")).toBe("/")
  link.title = "New host tooltip"
  release()
  release()
  expect(link.title).toBe("New host tooltip")
})

it("retains other runs sharing a parent and releases the hovered source on restore", () => {
  const p = document.querySelector("p")!
  const first = registerOriginalTextHover([p, p], "First paragraph")
  const second = registerOriginalTextHover([p], "Second paragraph")
  const duplicate = registerOriginalTextHover([p], "Second paragraph")
  controller.setEnabled(true)
  hover(p)
  expect(p.title).toBe("First paragraph\n\nSecond paragraph")
  first()
  expect(p.title).toBe("Site tooltip")
  hover(p)
  expect(p.title).toBe("Second paragraph")
  second()
  hover(p)
  expect(p.title).toBe("Second paragraph")
  duplicate()
  hover(p)
  expect(p.title).toBe("Site tooltip")
})

it("handles shadow-root translations, unrelated content and complete listener disposal", () => {
  const host = document.createElement("div")
  document.body.append(host)
  const shadow = host.attachShadow({ mode: "open" })
  const translated = document.createElement("span")
  translated.textContent = "影子树译文"
  shadow.append(translated)
  registerOriginalTextHover([translated], '<script>alert("plain text")</script>')
  controller.setEnabled(true)
  hover(translated)
  expect(translated.title).toBe('<script>alert("plain text")</script>')
  expect(shadow.querySelector("script")).toBeNull()
  hover(host)
  expect(translated).not.toHaveAttribute("title")
  hover(translated)
  controller.dispose()
  expect(translated).not.toHaveAttribute("title")
  hover(translated)
  expect(translated).not.toHaveAttribute("title")
})

it("overrides descendant titles only for the hover and restores them afterwards", () => {
  const p = document.querySelector("p")!
  const link = document.querySelector("a")!
  link.title = "Link tooltip"
  registerOriginalTextHover([p], "Entire original paragraph")
  controller.setEnabled(true)
  hover(link)
  expect(link.title).toBe("Entire original paragraph")
  expect(p.title).toBe("Site tooltip")
  leave(link)
  expect(link.title).toBe("Link tooltip")
})
