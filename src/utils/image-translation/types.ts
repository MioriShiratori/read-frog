export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface ImageTextBlock {
  id: number
  text: string
  confidence: number
  bbox: Rect
  quad: { x: number; y: number }[]
  angle: number
}

export interface ImageOcrResult {
  width: number
  height: number
  blocks: ImageTextBlock[]
}

export type ImageCaptureRequest =
  | { kind: "area"; rect: Rect; viewport: { width: number; height: number } }
  | { kind: "image"; url: string }

export interface OcrWorkerRequest {
  id: string
  image: string
  baseUrl: string
}

export type OcrWorkerResponse =
  | { id: string; ok: true; result: ImageOcrResult }
  | { id: string; ok: false; error: string }
