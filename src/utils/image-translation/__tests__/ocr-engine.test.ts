import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { recognizeImage } from "../ocr/engine"

const mocks = vi.hoisted(() => ({
  create: vi.fn<(data: ArrayBuffer) => Promise<object>>(),
  dispose: vi.fn<() => void>(),
}))
vi.mock("onnxruntime-web/wasm", () => ({
  env: { wasm: {} },
  InferenceSession: { create: mocks.create },
  Tensor: class {
    dispose = mocks.dispose
  },
}))
vi.mock("../ocr/vendor/crop", async (original) => ({
  ...(await original<typeof import("../ocr/vendor/crop")>()),
  bitmapToImageData: () => ({ width: 80, height: 40, data: new Uint8ClampedArray(80 * 40 * 4) }),
  resizeToImageData: () => ({ width: 80, height: 40, data: new Uint8ClampedArray(80 * 40 * 4) }),
  cropQuadToImageData: () => ({
    width: 100,
    height: 48,
    data: new Uint8ClampedArray(100 * 48 * 4),
  }),
}))
const close = vi.fn<() => void>()
const release = vi.fn<() => Promise<void>>()
const run = vi.fn<() => Promise<object>>()
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal(
    "fetch",
    vi
      .fn<typeof fetch>()
      .mockImplementation(
        async (url) =>
          new Response(
            (typeof url === "string" ? url : url instanceof URL ? url.href : url.url).endsWith(
              "dict.txt",
            )
              ? "H\ni\n"
              : new Uint8Array([1]),
          ),
      ),
  )
  vi.stubGlobal(
    "createImageBitmap",
    vi
      .fn<() => Promise<{ width: number; height: number; close: () => void }>>()
      .mockResolvedValue({ width: 80, height: 40, close }),
  )
  const map = new Float32Array(80 * 40)
  for (let y = 10; y < 20; y++) for (let x = 10; x < 60; x++) map[y * 80 + x] = 0.95
  run
    .mockResolvedValueOnce({ data: map, dims: [1, 1, 40, 80], dispose: mocks.dispose })
    .mockResolvedValue({
      data: new Float32Array([0, 0.9, 0, 0, 0, 0, 0.9, 0]),
      dims: [1, 2, 4],
      dispose: mocks.dispose,
    })
  mocks.create.mockResolvedValue({
    inputNames: ["in"],
    outputNames: ["out"],
    run: async () => ({ out: await run() }),
    release,
  })
})
afterEach(() => vi.unstubAllGlobals())

it("runs detector and recognizer with stable geometry and releases every tensor and model", async () => {
  const result = await recognizeImage(new Blob(), "https://local.invalid/")
  expect(result.blocks).toHaveLength(1)
  expect(result.blocks[0]?.text).toBe("Hi")
  expect(result.blocks[0]?.angle).toBeCloseTo(0)
  expect(close).toHaveBeenCalledOnce()
  expect(release).toHaveBeenCalledTimes(2)
  expect(mocks.dispose).toHaveBeenCalledTimes(4)
})

it("rejects oversized bitmaps before allocating inference sessions", async () => {
  vi.stubGlobal(
    "createImageBitmap",
    vi
      .fn<() => Promise<{ width: number; height: number; close: () => void }>>()
      .mockResolvedValue({ width: 5000, height: 5000, close }),
  )
  await expect(recognizeImage(new Blob(), "https://local.invalid/")).rejects.toThrow(
    "IMAGE_TOO_LARGE",
  )
  expect(mocks.create).not.toHaveBeenCalled()
  expect(close).toHaveBeenCalledOnce()
})

it("releases an already loaded detector if recognizer loading fails", async () => {
  vi.mocked(fetch).mockImplementation(
    async (url) =>
      new Response(new Uint8Array([1]), {
        status: (typeof url === "string" ? url : url instanceof URL ? url.href : url.url).endsWith(
          "rec.onnx",
        )
          ? 404
          : 200,
      }),
  )
  await expect(recognizeImage(new Blob(), "https://local.invalid/")).rejects.toThrow(
    "Cannot load OCR model (404)",
  )
  expect(close).toHaveBeenCalledOnce()
  expect(release).toHaveBeenCalledOnce()
})

it("releases input tensors and sessions when inference fails", async () => {
  run.mockReset().mockRejectedValue(new Error("inference failed"))
  await expect(recognizeImage(new Blob(), "https://local.invalid/")).rejects.toThrow(
    "inference failed",
  )
  expect(mocks.dispose).toHaveBeenCalledOnce()
  expect(release).toHaveBeenCalledTimes(2)
  expect(close).toHaveBeenCalledOnce()
})
