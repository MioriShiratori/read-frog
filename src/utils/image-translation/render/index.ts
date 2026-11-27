import type { ImageOcrResult, ImageTextBlock } from "../types"
import { fitText, uprightAngle } from "./layout"
import { cropBounds, createStrokeMask } from "./mask"
import { TeleaKernel } from "./telea"

const FONT = '"Noto Sans CJK SC", "Microsoft YaHei", sans-serif'

export async function renderImageTranslation(
  image: string,
  ocr: ImageOcrResult,
  translations: ReadonlyMap<number, string>,
): Promise<string> {
  const bitmap = await createImageBitmap(await (await fetch(image)).blob())
  const canvas = document.createElement("canvas")
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) {
    bitmap.close()
    throw new Error("IMAGE_CANVAS_UNAVAILABLE")
  }
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()
  const kernel = new TeleaKernel()
  for (const block of ocr.blocks) {
    if (!translations.get(block.id)) continue
    const crop = cropBounds(block.bbox, canvas.width, canvas.height)
    if (crop.width <= 0 || crop.height <= 0) continue
    const pixels = ctx.getImageData(crop.x, crop.y, crop.width, crop.height)
    kernel.inpaintFMM(crop.width, crop.height, pixels.data, createStrokeMask(pixels, crop, block))
    ctx.putImageData(pixels, crop.x, crop.y)
  }
  for (const block of ocr.blocks) {
    const text = translations.get(block.id)
    if (text) drawTranslation(ctx, block, text)
  }
  return canvas.toDataURL("image/png")
}

function drawTranslation(ctx: CanvasRenderingContext2D, block: ImageTextBlock, text: string) {
  const { bbox } = block
  const angle = uprightAngle(block.angle)
  const vertical = Math.abs(angle) > Math.PI / 4
  const width = vertical ? bbox.height : bbox.width
  const height = vertical ? bbox.width : bbox.height
  const layout = fitText(text, Math.max(8, width), Math.max(8, height), (value, size) => {
    ctx.font = `${size}px ${FONT}`
    return ctx.measureText(value).width
  })
  ctx.save()
  ctx.translate(bbox.x + bbox.width / 2, bbox.y + bbox.height / 2)
  ctx.rotate(angle)
  ctx.font = `${layout.size}px ${FONT}`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.strokeStyle = "white"
  ctx.lineWidth = Math.max(2, layout.size / 5)
  ctx.fillStyle = "#171717"
  const lineHeight = layout.size * 1.2
  layout.lines.forEach((line, index) => {
    const y = (index - (layout.lines.length - 1) / 2) * lineHeight
    ctx.strokeText(line, 0, y)
    ctx.fillText(line, 0, y)
  })
  ctx.restore()
}
