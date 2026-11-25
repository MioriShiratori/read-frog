// @vitest-environment jsdom

import { expect, it } from "vitest"
import { styleTranslationOnlyText } from "../translation-only-style"

const config = { preset: "textColor", isCustom: false, customCSS: null } as const

it("applies box and underline presets to an outer target without decorating nested links twice", () => {
  const p = document.createElement("p")
  p.innerHTML = '<a href="/link">Translated link</a> translated text'
  const link = p.querySelector("a")!
  const restore = styleTranslationOnlyText([link.firstChild as Text, p.lastChild as Text], {
    ...config,
    preset: "dashedLine",
  })
  expect(p).toHaveAttribute("data-read-frog-custom-translation-style", "dashedLine")
  expect(link).not.toHaveAttribute("data-read-frog-custom-translation-style")
  restore()
  expect(p).not.toHaveAttribute("data-read-frog-custom-translation-style")
})

it("retains shared parent styling until the last translated run releases it", () => {
  document.body.innerHTML = "<p>First <em>nested</em> second</p>"
  const p = document.querySelector("p")!
  const first = styleTranslationOnlyText([p.firstChild as Text], config)
  const second = styleTranslationOnlyText([p.lastChild as Text], config)
  first()
  first()
  expect(p).toHaveAttribute("data-read-frog-custom-translation-style", "textColor")
  second()
  expect(p).not.toHaveAttribute("data-read-frog-custom-translation-style")
})

it("preserves metadata changed by the host while translation was visible", () => {
  const node = document.createTextNode("Translated")
  const p = document.createElement("p")
  p.append(node)
  const restore = styleTranslationOnlyText([node], config)
  p.setAttribute("data-read-frog-custom-translation-style", "border")
  p.setAttribute("data-read-frog-translation-only-style", "host")
  restore()
  expect(p).toHaveAttribute("data-read-frog-custom-translation-style", "border")
  expect(p).toHaveAttribute("data-read-frog-translation-only-style", "host")
})

it("restores pre-existing markers and supports custom styles without styling detached text", () => {
  const p = document.createElement("p")
  const node = document.createTextNode("Translated")
  p.append(node)
  p.setAttribute("data-read-frog-custom-translation-style", "weakened")
  p.setAttribute("data-read-frog-translation-only-style", "original")
  const restore = styleTranslationOnlyText([node, document.createTextNode("Detached")], {
    preset: "default",
    isCustom: true,
    customCSS: "p { color: green }",
  })
  expect(p).toHaveAttribute("data-read-frog-custom-translation-style", "custom")
  restore()
  expect(p).toHaveAttribute("data-read-frog-custom-translation-style", "weakened")
  expect(p).toHaveAttribute("data-read-frog-translation-only-style", "original")
})
