// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { ImageSelectionLayer, selectionRect, type ImageSelection } from "../selection"

afterEach(() => {
  cleanup()
  Reflect.deleteProperty(document, "elementsFromPoint")
})

it("selects the image at release even without a preceding pointer move", () => {
  const image = document.createElement("img")
  image.src = "https://example.com/image.png"
  Object.defineProperty(image, "naturalWidth", { value: 200 })
  Object.defineProperty(document, "elementsFromPoint", {
    configurable: true,
    value: (x: number, y: number) => (x === 40 && y === 50 ? [image] : []),
  })
  const onSelect = vi.fn<(selection: ImageSelection) => void>()
  render(<ImageSelectionLayer mode="image" onSelect={onSelect} />)
  fireEvent(
    screen.getByTestId("image-translation-selection"),
    new MouseEvent("pointerup", { clientX: 40, clientY: 50, bubbles: true }),
  )
  expect(onSelect).toHaveBeenCalledWith(
    expect.objectContaining({ element: image, url: "https://example.com/image.png" }),
  )
})

it("clips a captured selection to the viewport so its overlay matches the returned pixels", () => {
  expect(selectionRect({ x: 5, y: 6 }, { x: -100, y: 2000 }, { width: 100, height: 80 })).toEqual({
    x: 0,
    y: 6,
    width: 5,
    height: 74,
  })
})
