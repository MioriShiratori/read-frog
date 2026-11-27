// SPDX-License-Identifier: GPL-3.0-or-later
// Stroke masking adapted from Kites Binarizer.ts @ 98751588e5f37ef468a0e00059d3eb953b66eb4c.
import type { ImageTextBlock, Rect } from "../types"
import { pointInConvexPolygon } from "../ocr/vendor/geometry"

export function cropBounds(rect: Rect, width: number, height: number, padding = 15): Rect {
  const x = Math.max(0, Math.floor(rect.x) - padding)
  const y = Math.max(0, Math.floor(rect.y) - padding)
  return {
    x,
    y,
    width: Math.min(width - x, Math.ceil(rect.x + rect.width) + padding - x),
    height: Math.min(height - y, Math.ceil(rect.y + rect.height) + padding - y),
  }
}

function otsu(histogram: Uint32Array, total: number): number {
  const sum = histogram.reduce((value, count, level) => value + count * level, 0)
  let background = 0,
    backgroundSum = 0,
    best = 0,
    threshold = 127
  for (let level = 0; level < 256; level++) {
    background += histogram[level]!
    if (!background) continue
    const foreground = total - background
    if (!foreground) break
    backgroundSum += level * histogram[level]!
    const difference = backgroundSum / background - (sum - backgroundSum) / foreground
    const variance = background * foreground * difference * difference
    if (variance > best) {
      best = variance
      threshold = level
    }
  }
  return threshold
}

export function createStrokeMask(
  pixels: ImageData,
  crop: Rect,
  block: ImageTextBlock,
): Uint8ClampedArray {
  const histogram = new Uint32Array(256)
  const gray = new Uint8Array(pixels.width * pixels.height)
  let border = 0,
    count = 0
  for (let i = 0; i < gray.length; i++) {
    const value = Math.round(
      0.299 * pixels.data[i * 4]! +
        0.587 * pixels.data[i * 4 + 1]! +
        0.114 * pixels.data[i * 4 + 2]!,
    )
    gray[i] = value
    histogram[value] = histogram[value]! + 1
    const x = i % pixels.width,
      y = Math.floor(i / pixels.width)
    if (x === 0 || y === 0 || x === pixels.width - 1 || y === pixels.height - 1) {
      border += value
      count++
    }
  }
  const threshold = otsu(histogram, gray.length)
  const lightBackground = border / Math.max(1, count) > 127
  const mask = new Uint8ClampedArray(pixels.data.length)
  for (let i = 0; i < gray.length; i++) {
    if (pixels.data[i * 4 + 3]! < 128) continue
    if (lightBackground ? gray[i]! > threshold : gray[i]! <= threshold) continue
    const x = i % pixels.width,
      y = Math.floor(i / pixels.width)
    if (!pointInConvexPolygon({ x: x + crop.x, y: y + crop.y }, block.quad)) continue
    markStroke(mask, pixels.width, pixels.height, x, y)
  }
  return mask
}

function markStroke(mask: Uint8ClampedArray, width: number, height: number, x: number, y: number) {
  for (let yy = Math.max(0, y - 1); yy <= Math.min(height - 1, y + 1); yy++) {
    for (let xx = Math.max(0, x - 1); xx <= Math.min(width - 1, x + 1); xx++)
      mask[(yy * width + xx) * 4] = 255
  }
}
