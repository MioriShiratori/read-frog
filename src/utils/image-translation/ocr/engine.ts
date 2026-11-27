import type { ImageOcrResult, ImageTextBlock } from "../types"
// The inference stages follow Screen OCR Translator's PP-OCRv6 engine.
// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 Oleksandr Perepadia and Read Frog contributors.
import * as ort from "onnxruntime-web/wasm"
import {
  bitmapToImageData,
  cropQuadToImageData,
  isRotatedForRecognition,
  padQuad,
  resizeToImageData,
} from "./vendor/crop"
import { ctcGreedyDecode } from "./vendor/ctc"
import { extractBoxes, type DetectedBox } from "./vendor/db-postprocess"
import { makeCharAt, parseDict } from "./vendor/dict"
import { readingAngleOfQuad } from "./vendor/geometry"
import { computeDetSize, imageDataToNchw } from "./vendor/preprocess"

async function loadSession(url: string) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Cannot load OCR model (${response.status})`)
  return ort.InferenceSession.create(await response.arrayBuffer(), {
    executionProviders: ["wasm"],
    graphOptimizationLevel: "all",
  })
}

async function run(session: ort.InferenceSession, pixels: ImageData, detector: boolean) {
  const mean: [number, number, number] = detector ? [0.485, 0.456, 0.406] : [0.5, 0.5, 0.5]
  const std: [number, number, number] = detector ? [0.229, 0.224, 0.225] : [0.5, 0.5, 0.5]
  const input = new ort.Tensor(
    "float32",
    imageDataToNchw(pixels.data, pixels.width, pixels.height, mean, std),
    [1, 3, pixels.height, pixels.width],
  )
  try {
    const inputName = session.inputNames[0],
      outputName = session.outputNames[0]
    if (!inputName || !outputName) throw new Error("Invalid OCR model interface")
    const outputs = await session.run({ [inputName]: input })
    const output = outputs[outputName]
    if (!output || !(output.data instanceof Float32Array))
      throw new Error("Invalid OCR model output")
    return output
  } finally {
    input.dispose()
  }
}

async function detect(session: ort.InferenceSession, bitmap: ImageBitmap) {
  const { targetW, targetH } = computeDetSize(bitmap.width, bitmap.height, 960)
  const output = await run(session, resizeToImageData(bitmap, targetW, targetH), true)
  try {
    const mapH = output.dims[2],
      mapW = output.dims[3]
    if (!mapH || !mapW) throw new Error("Invalid detector dimensions")
    if (!(output.data instanceof Float32Array)) throw new Error("Invalid detector data")
    return extractBoxes(
      output.data,
      mapW,
      mapH,
      {
        threshold: 0.2,
        boxThreshold: 0.45,
        unclipRatio: 1.4,
        minBoxSize: 3,
        padding: 3,
      },
      bitmap.width / mapW,
      bitmap.height / mapH,
      bitmap.width,
      bitmap.height,
    )
  } finally {
    output.dispose()
  }
}

async function readLine(
  session: ort.InferenceSession,
  pixels: ImageData,
  box: DetectedBox,
  charAt: (index: number) => string | null,
  readsDown: boolean,
) {
  const crop = cropQuadToImageData(pixels, box.quad, 48, 48, 2400, 3, readsDown)
  const output = await run(session, crop, false)
  try {
    if (!(output.data instanceof Float32Array)) throw new Error("Invalid recognizer data")
    const timeSteps = output.dims[1],
      classes = output.dims[2]
    if (!timeSteps || !classes) throw new Error("Invalid recognizer dimensions")
    return ctcGreedyDecode(output.data, timeSteps, classes, charAt, true)
  } finally {
    output.dispose()
  }
}

export async function recognizeImage(image: Blob, baseUrl: string): Promise<ImageOcrResult> {
  ort.env.wasm.wasmPaths = baseUrl
  ort.env.wasm.numThreads = 1
  ort.env.wasm.proxy = false
  const bitmap = await createImageBitmap(image)
  if (bitmap.width * bitmap.height > 16_000_000) {
    bitmap.close()
    throw new Error("IMAGE_TOO_LARGE")
  }
  const sessions: ort.InferenceSession[] = []
  try {
    const detector = await loadSession(`${baseUrl}det.onnx`)
    sessions.push(detector)
    const recognizer = await loadSession(`${baseUrl}rec.onnx`)
    sessions.push(recognizer)
    const dictionary = await fetch(`${baseUrl}dict.txt`)
    if (!dictionary.ok) throw new Error("Cannot load OCR dictionary")
    const charAt = makeCharAt(parseDict(await dictionary.text()))
    const pixels = bitmapToImageData(bitmap)
    const boxes = await detect(detector, bitmap)
    const blocks: ImageTextBlock[] = []
    for (const box of boxes) {
      const quad = padQuad(box.quad, 0)
      const readsDown = isRotatedForRecognition(quad)
      const line = await readLine(recognizer, pixels, box, charAt, readsDown)
      if (line.text.trim() && line.confidence >= 0.35) {
        blocks.push({
          id: blocks.length,
          text: line.text.trim(),
          confidence: line.confidence,
          bbox: box.bbox,
          quad,
          angle: readingAngleOfQuad(quad, readsDown),
        })
      }
    }
    return { width: bitmap.width, height: bitmap.height, blocks }
  } finally {
    bitmap.close()
    await Promise.all(sessions.map((session) => session.release()))
  }
}
