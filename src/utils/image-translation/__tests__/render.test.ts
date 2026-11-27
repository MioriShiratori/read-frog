import { describe, expect, it } from "vitest"
import { fitText, uprightAngle, wrapText } from "../render/layout"
import { createStrokeMask, cropBounds } from "../render/mask"
import { TeleaKernel } from "../render/telea"

describe("image translation rendering", () => {
  it("removes a masked glyph without changing unmasked artwork", () => {
    const width = 9,
      height = 9
    const pixels = new Uint8ClampedArray(width * height * 4)
    for (let i = 0; i < pixels.length; i += 4) pixels.set([20, 100, 160, 255], i)
    const center = (4 * width + 4) * 4
    pixels.set([0, 0, 0, 255], center)
    const mask = new Uint8ClampedArray(pixels.length)
    mask[center] = 255
    const before = pixels.slice()
    new TeleaKernel().inpaintFMM(width, height, pixels, mask)
    expect([...pixels.slice(center, center + 4)]).toEqual([20, 100, 160, 255])
    before.set(pixels.slice(center, center + 4), center)
    expect(pixels).toEqual(before)
  })

  it.each([0, 255])(
    "masks glyph strokes on background %i without erasing adjacent artwork",
    (background) => {
      const data = new Uint8ClampedArray(7 * 7 * 4)
      for (let i = 0; i < data.length; i += 4)
        data.set([background, background, background, 255], i)
      const foreground = 255 - background
      data.set([foreground, foreground, foreground, 255], (3 * 7 + 3) * 4)
      data.set([foreground, foreground, foreground, 255], 0)
      const block = {
        id: 0,
        text: "A",
        confidence: 1,
        angle: 0,
        bbox: { x: 2, y: 2, width: 2, height: 2 },
        quad: [
          { x: 2, y: 2 },
          { x: 4, y: 2 },
          { x: 4, y: 4 },
          { x: 2, y: 4 },
        ],
      }
      const mask = createStrokeMask(
        { data, width: 7, height: 7, colorSpace: "srgb" },
        { x: 0, y: 0, width: 7, height: 7 },
        block,
      )
      expect(mask[(3 * 7 + 3) * 4]).toBe(255)
      expect(mask[0]).toBe(0)
      expect([...mask].filter((value) => value === 255)).toHaveLength(9)
    },
  )

  it("leaves images with no text mask unchanged", () => {
    const pixels = new Uint8ClampedArray([20, 30, 40, 255, 50, 60, 70, 255])
    const before = pixels.slice()
    new TeleaKernel().inpaintFMM(2, 1, pixels, new Uint8ClampedArray(8))
    expect(pixels).toEqual(before)
  })

  it("keeps every character when wrapping mixed CJK and a long Latin word", () => {
    const text = "你好世界 abcdefghijklmnop"
    const lines = wrapText(text, 4, (value) => value.length)
    expect(lines.join("").replaceAll(" ", "")).toBe(text.replaceAll(" ", ""))
    expect(lines.every((line) => line.length <= 4)).toBe(true)
  })

  it("fits expanded translations into multiple lines", () => {
    const layout = fitText(
      "Hello world this translation is longer",
      160,
      70,
      (value, size) => value.length * size * 0.55,
    )
    expect(layout.lines.length * layout.size * 1.2).toBeLessThanOrEqual(70)
    expect(layout.lines.join(" ").replaceAll(" ", "")).toBe("Helloworldthistranslationislonger")
  })

  it("keeps a detector baseline upright regardless of its corner ordering", () => {
    expect(uprightAngle(Math.PI)).toBeCloseTo(0)
    expect(uprightAngle(-Math.PI + 0.1)).toBeCloseTo(0.1)
    expect(uprightAngle(Math.PI / 2)).toBeCloseTo(Math.PI / 2)
  })

  it("rejects output that cannot fit rather than overlapping neighboring artwork", () => {
    expect(() => fitText("x".repeat(1000), 10, 10, (text, size) => text.length * size)).toThrow(
      "IMAGE_TRANSLATION_TOO_LONG",
    )
  })

  it("clips edge text context to image bounds", () => {
    expect(cropBounds({ x: -2, y: 4, width: 12, height: 20 }, 16, 16)).toEqual({
      x: 0,
      y: 0,
      width: 16,
      height: 16,
    })
  })
})
