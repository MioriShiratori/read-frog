// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { ImageTranslationResult } from "../result"

afterEach(() => {
  cleanup()
  document.querySelector("#fixture-image")?.remove()
  vi.unstubAllGlobals()
})

it("follows the same source node's geometry and closes when its source changes", async () => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  )
  const image = document.createElement("img")
  image.id = "fixture-image"
  image.src = "https://example.com/original.png"
  document.body.append(image)
  const rect = vi
    .spyOn(image, "getBoundingClientRect")
    .mockReturnValue(new DOMRect(30, 40, 100, 50))
  const onClose = vi.fn<() => void>()
  render(
    <ImageTranslationResult
      selection={{
        element: image,
        url: image.src,
        rect: image.getBoundingClientRect(),
        scrollX: 0,
        scrollY: 0,
      }}
      image="translated.png"
      original="original.png"
      showOriginal={false}
      onClose={onClose}
    />,
  )
  const overlay = screen.getByTestId("image-translation-result")
  expect(overlay).toHaveStyle({ left: "30px", top: "40px", width: "100px", height: "50px" })
  expect(document.querySelector("#fixture-image")).toBe(image)
  rect.mockReturnValue(new DOMRect(50, 60, 200, 100))
  fireEvent(window, new Event("resize"))
  expect(overlay).toHaveStyle({ left: "50px", top: "60px", width: "200px", height: "100px" })
  image.src = "https://example.com/replaced.png"
  await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
})
