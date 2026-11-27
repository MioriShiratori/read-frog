import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { renderImageTranslation } from "../render"

const close = vi.fn<() => void>()
const rotate = vi.fn<(angle: number) => void>()
const fillText = vi.fn<(text: string, x: number, y: number) => void>()
const ctx = {
  font: "",
  textAlign: "",
  textBaseline: "",
  strokeStyle: "",
  lineWidth: 0,
  fillStyle: "",
  drawImage: vi.fn<() => void>(),
  getImageData: (_x: number, _y: number, width: number, height: number) => ({
    width,
    height,
    data: new Uint8ClampedArray(width * height * 4).fill(255),
    colorSpace: "srgb",
  }),
  putImageData: vi.fn<() => void>(),
  save: vi.fn<() => void>(),
  restore: vi.fn<() => void>(),
  translate: vi.fn<() => void>(),
  rotate,
  fillText,
  strokeText: vi.fn<() => void>(),
  measureText: (value: string) => ({ width: value.length * Number.parseFloat(ctx.font) }),
}
const canvas = { width: 0, height: 0, getContext: () => ctx, toDataURL: () => "translated-image" }
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(new Response(new Blob())))
  vi.stubGlobal(
    "createImageBitmap",
    vi
      .fn<() => Promise<{ width: number; height: number; close: () => void }>>()
      .mockResolvedValue({ width: 100, height: 40, close }),
  )
  vi.stubGlobal("document", { createElement: () => canvas })
})
afterEach(() => vi.unstubAllGlobals())

it("renders translated glyphs upright onto a copy and releases the source bitmap", async () => {
  const block = {
    id: 1,
    text: "Hello",
    confidence: 1,
    angle: Math.PI,
    bbox: { x: 5, y: 5, width: 90, height: 30 },
    quad: [
      { x: 5, y: 5 },
      { x: 95, y: 5 },
      { x: 95, y: 35 },
      { x: 5, y: 35 },
    ],
  }
  const result = await renderImageTranslation(
    "image",
    { width: 100, height: 40, blocks: [block] },
    new Map([[1, "你好"]]),
  )
  expect(result).toBe("translated-image")
  expect(fillText).toHaveBeenCalledWith("你好", 0, 0)
  expect(rotate.mock.calls[0]![0]).toBeCloseTo(0)
  expect(close).toHaveBeenCalledOnce()
  expect(canvas.width).toBe(100)
})
