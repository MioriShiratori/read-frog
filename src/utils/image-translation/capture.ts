import type { ImageCaptureRequest } from "./types"
import { browser } from "wxt/browser"

export async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  const chunks: string[] = []
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + 0x8000)))
  }
  return `data:${blob.type || "image/png"};base64,${btoa(chunks.join(""))}`
}

async function requireActiveTab(tabId: number, windowId: number) {
  const [active] = await browser.tabs.query({ active: true, windowId })
  if (active?.id !== tabId) throw new Error("CAPTURE_TAB_CHANGED")
}

export async function captureTranslationImage(
  request: ImageCaptureRequest,
  tabId: number,
  windowId: number,
): Promise<string> {
  if (request.kind === "image") {
    const url = new URL(request.url)
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("IMAGE_URL_UNSUPPORTED")
    const response = await fetch(url.href, {
      credentials: "include",
      signal: AbortSignal.timeout(30_000),
    })
    if (!response.ok) throw new Error(`IMAGE_FETCH_FAILED (${response.status})`)
    const blob = await response.blob()
    if (blob.size > 25_000_000) throw new Error("IMAGE_TOO_LARGE")
    return blobToDataUrl(blob)
  }
  await requireActiveTab(tabId, windowId)
  const data = await browser.tabs.captureVisibleTab(windowId, { format: "png" })
  await requireActiveTab(tabId, windowId)
  const bitmap = await createImageBitmap(await (await fetch(data)).blob())
  try {
    const { rect, viewport } = request
    if (
      ![viewport.width, viewport.height, rect.x, rect.y, rect.width, rect.height].every(
        Number.isFinite,
      ) ||
      viewport.width <= 0 ||
      viewport.height <= 0
    )
      throw new Error("CAPTURE_INVALID_SIZE")
    const x = Math.max(0, rect.x),
      y = Math.max(0, rect.y)
    const width = Math.min(rect.x + rect.width, viewport.width) - x
    const height = Math.min(rect.y + rect.height, viewport.height) - y
    if (width <= 0 || height <= 0) throw new Error("CAPTURE_INVALID_SIZE")
    const sx = bitmap.width / viewport.width,
      sy = bitmap.height / viewport.height
    const canvas = new OffscreenCanvas(Math.ceil(width * sx), Math.ceil(height * sy))
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("IMAGE_CANVAS_UNAVAILABLE")
    ctx.drawImage(
      bitmap,
      x * sx,
      y * sy,
      width * sx,
      height * sy,
      0,
      0,
      canvas.width,
      canvas.height,
    )
    return blobToDataUrl(await canvas.convertToBlob({ type: "image/png" }))
  } finally {
    bitmap.close()
  }
}
