import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { captureTranslationImage } from "../capture"

const { query, screenshot } = vi.hoisted(() => ({
  query: vi.fn<() => Promise<{ id: number }[]>>(),
  screenshot: vi.fn<(windowId: number, options: { format: string }) => Promise<string>>(),
}))
vi.mock("wxt/browser", () => ({ browser: { tabs: { query, captureVisibleTab: screenshot } } }))

beforeEach(() => {
  query.mockReset()
  screenshot.mockReset()
})

afterEach(() => vi.unstubAllGlobals())

it("refuses to capture another tab after the user switches", async () => {
  query.mockResolvedValue([{ id: 42 }])
  await expect(
    captureTranslationImage(
      {
        kind: "area",
        rect: { x: 0, y: 0, width: 20, height: 20 },
        viewport: { width: 100, height: 100 },
      },
      7,
      3,
    ),
  ).rejects.toThrow("CAPTURE_TAB_CHANGED")
  expect(screenshot).not.toHaveBeenCalled()
})

it("checks the active tab again after capture before returning pixels", async () => {
  query.mockResolvedValueOnce([{ id: 7 }]).mockResolvedValueOnce([{ id: 42 }])
  screenshot.mockResolvedValue("data:image/png;base64,unused")
  await expect(
    captureTranslationImage(
      {
        kind: "area",
        rect: { x: 0, y: 0, width: 20, height: 20 },
        viewport: { width: 100, height: 100 },
      },
      7,
      3,
    ),
  ).rejects.toThrow("CAPTURE_TAB_CHANGED")
  expect(screenshot).toHaveBeenCalledWith(3, { format: "png" })
})

it("does not fetch arbitrary schemes through the privileged background", async () => {
  await expect(
    captureTranslationImage({ kind: "image", url: "file:///private.png" }, 7, 3),
  ).rejects.toThrow("IMAGE_URL_UNSUPPORTED")
})

it("maps CSS selection coordinates to screenshot pixels at 2x scale and closes the bitmap", async () => {
  query.mockResolvedValue([{ id: 7 }])
  screenshot.mockResolvedValue("data:image/png;base64,unused")
  const close = vi.fn<() => void>()
  const draw = vi.fn<(...args: (object | number)[]) => void>()
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>().mockResolvedValue(new Response(new Blob(["png"], { type: "image/png" }))),
  )
  vi.stubGlobal(
    "createImageBitmap",
    vi
      .fn<() => Promise<{ width: number; height: number; close: () => void }>>()
      .mockResolvedValue({ width: 200, height: 100, close }),
  )
  vi.stubGlobal(
    "OffscreenCanvas",
    class {
      constructor(
        public width: number,
        public height: number,
      ) {}
      getContext() {
        return { drawImage: draw }
      }
      async convertToBlob() {
        return new Blob(["cropped"], { type: "image/png" })
      }
    },
  )
  const output = await captureTranslationImage(
    {
      kind: "area",
      rect: { x: -5, y: 10, width: 25, height: 100 },
      viewport: { width: 100, height: 50 },
    },
    7,
    3,
  )
  expect(draw).toHaveBeenCalledWith(
    expect.objectContaining({ width: 200, height: 100 }),
    0,
    20,
    40,
    80,
    0,
    0,
    40,
    80,
  )
  expect(output).toBe("data:image/png;base64,Y3JvcHBlZA==")
  expect(close).toHaveBeenCalledOnce()
})

it("returns an image fetch failure without attempting a screenshot", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 403 })),
  )
  await expect(
    captureTranslationImage({ kind: "image", url: "https://example.com/private.png" }, 7, 3),
  ).rejects.toThrow("IMAGE_FETCH_FAILED (403)")
  expect(screenshot).not.toHaveBeenCalled()
})
