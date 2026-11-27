import type { Quad } from "../ocr/vendor/geometry"
import { expect, it } from "vitest"
import {
  cropQuad,
  isRotatedForRecognition,
  padQuad,
  rotate90CounterClockwise,
} from "../ocr/vendor/crop"
import { ctcGreedyDecode } from "../ocr/vendor/ctc"
import { extractBoxes } from "../ocr/vendor/db-postprocess"
import { makeCharAt, parseDict } from "../ocr/vendor/dict"
import { readingAngleOfQuad } from "../ocr/vendor/geometry"
import { computeDetSize, computeRecWidth, imageDataToNchw } from "../ocr/vendor/preprocess"

it("decodes CTC repeats and blank-separated repeated CJK characters using dictionary indexes", () => {
  const charAt = makeCharAt(parseDict("你\r\n好\r\n"))
  const sequence = [1, 1, 0, 1, 2, 3]
  const data = new Float32Array(sequence.length * 4)
  sequence.forEach((value, index) => {
    data[index * 4 + value] = 0.9
  })
  const result = ctcGreedyDecode(data, sequence.length, 4, charAt, true)
  expect(result.text).toBe("你你好 ")
  expect(result.confidence).toBeCloseTo(0.9)
  expect(charAt(4)).toBeNull()
  expect(charAt(0)).toBeNull()
  expect(parseDict("a\n\nb\n")).toEqual(["a", "", "b"])
})

it("keeps detector scale and normalized tensor channels consistent", () => {
  const size = computeDetSize(1920, 1080, 960)
  expect(size.targetW % 32).toBe(0)
  expect(size.targetH % 32).toBe(0)
  expect(size.targetW * size.scaleX).toBe(1920)
  expect(size.targetH * size.scaleY).toBe(1080)
  expect(computeRecWidth(10000, 20, 48, 48, 2400)).toBe(2400)
  const tensor = imageDataToNchw(
    new Uint8Array([255, 0, 128, 255, 0, 255, 128, 0]),
    2,
    1,
    [0.5, 0.5, 0.5],
    [0.5, 0.5, 0.5],
  )
  expect([...tensor.slice(0, 4)]).toEqual([1, -1, -1, 1])
  expect(tensor[4]).toBeCloseTo(1 / 255)
})

it("extracts scaled text boxes while rejecting isolated noise and preserves readable direction", () => {
  const width = 80,
    height = 40,
    map = new Float32Array(width * height)
  for (let y = 10; y < 20; y++) for (let x = 10; x < 60; x++) map[y * width + x] = 0.95
  map[1] = 1
  const boxes = extractBoxes(
    map,
    width,
    height,
    { threshold: 0.2, boxThreshold: 0.45, unclipRatio: 1.4, minBoxSize: 3, padding: 3 },
    2,
    2,
    160,
    80,
  )
  expect(boxes).toHaveLength(1)
  const box = boxes[0]!
  expect(box.bbox.x).toBeLessThan(20)
  expect(box.bbox.x + box.bbox.width).toBeGreaterThan(118)
  const ordered = padQuad(box.quad, 0)
  expect(isRotatedForRecognition(ordered)).toBe(false)
  expect(readingAngleOfQuad(ordered, false)).toBeCloseTo(0)
})

it("orders reverse detector corners before cropping and rotates vertical pixels consistently", () => {
  const quad: Quad = [
    { x: 6, y: 0 },
    { x: 6, y: 2 },
    { x: 0, y: 2 },
    { x: 0, y: 0 },
  ]
  const source = { width: 6, height: 2, data: new Uint8ClampedArray(6 * 2 * 4).fill(160) }
  const crop = cropQuad(source, quad)
  expect([crop.width, crop.height]).toEqual([6, 2])
  expect([...crop.data].every((value) => value === 160)).toBe(true)
  const rotated = rotate90CounterClockwise(crop)
  expect([rotated.width, rotated.height]).toEqual([2, 6])
  const vertical: Quad = [
    { x: 0, y: 0 },
    { x: 2, y: 0 },
    { x: 2, y: 12 },
    { x: 0, y: 12 },
  ]
  expect(isRotatedForRecognition(vertical)).toBe(true)
  expect(readingAngleOfQuad(padQuad(vertical, 3), true)).toBeCloseTo(Math.PI / 2)
})
