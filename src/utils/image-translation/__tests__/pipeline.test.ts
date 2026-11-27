import type { ImageOcrResult } from "../types"
import { beforeEach, expect, it, vi } from "vitest"
import { DEFAULT_CONFIG } from "@/utils/constants/config"
import { translateCapturedImage } from "../pipeline"

const mocks = vi.hoisted(() => ({
  ocr: vi.fn<() => Promise<ImageOcrResult>>(),
  translate: vi.fn<() => Promise<string>>(),
  render: vi.fn<() => Promise<string>>(),
}))
vi.mock("@/utils/config/storage", () => ({ getLocalConfig: async () => DEFAULT_CONFIG }))
vi.mock("@/utils/message", () => ({ sendMessage: mocks.ocr }))
vi.mock("@/utils/host/translate/translate-text", () => ({ translateTextCore: mocks.translate }))
vi.mock("../render", () => ({ renderImageTranslation: mocks.render }))

const block = {
  id: 8,
  text: "Hello world",
  confidence: 0.9,
  bbox: { x: 0, y: 0, width: 100, height: 20 },
  quad: [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 20 },
    { x: 0, y: 20 },
  ],
  angle: 0,
}

beforeEach(() => {
  mocks.ocr.mockReset().mockResolvedValue({ width: 200, height: 100, blocks: [block] })
  mocks.translate.mockReset().mockResolvedValue("你好世界")
  mocks.render.mockReset().mockResolvedValue("translated-image")
})

it("retains block identity through OCR, translation and image rendering", async () => {
  const result = await translateCapturedImage(
    "image",
    "job",
    new AbortController().signal,
    () => {},
  )
  expect(result.image).toBe("translated-image")
  expect(mocks.render).toHaveBeenCalledWith(
    "image",
    expect.objectContaining({ blocks: [block] }),
    new Map([[8, "你好世界"]]),
  )
  expect(mocks.translate).toHaveBeenCalledWith(
    expect.objectContaining({
      text: "Hello world",
      enableAIContentAware: false,
      extraHashTags: ["imageTranslation"],
    }),
  )
})

it("does not send empty OCR results to the translation provider", async () => {
  mocks.ocr.mockResolvedValue({ width: 200, height: 100, blocks: [] })
  await expect(
    translateCapturedImage("image", "job", new AbortController().signal, () => {}),
  ).rejects.toThrow("IMAGE_NO_TEXT")
  expect(mocks.translate).not.toHaveBeenCalled()
  expect(mocks.render).not.toHaveBeenCalled()
})

it("does not render a provider's empty translation", async () => {
  mocks.translate.mockResolvedValue(" ")
  await expect(
    translateCapturedImage("image", "job", new AbortController().signal, () => {}),
  ).rejects.toThrow("IMAGE_TRANSLATION_EMPTY")
  expect(mocks.render).not.toHaveBeenCalled()
})

it("stops scheduling translation when cancelled after OCR", async () => {
  const abort = new AbortController()
  mocks.ocr.mockImplementation(async () => {
    abort.abort()
    return { width: 200, height: 100, blocks: [block] }
  })
  await expect(translateCapturedImage("image", "job", abort.signal, () => {})).rejects.toThrow(
    "aborted",
  )
  expect(mocks.translate).not.toHaveBeenCalled()
  expect(mocks.render).not.toHaveBeenCalled()
})

it("discards an in-flight translation after cancellation", async () => {
  const abort = new AbortController()
  mocks.translate.mockImplementation(async () => {
    abort.abort()
    return "你好"
  })
  await expect(translateCapturedImage("image", "job", abort.signal, () => {})).rejects.toThrow(
    "aborted",
  )
  expect(mocks.render).not.toHaveBeenCalled()
})
