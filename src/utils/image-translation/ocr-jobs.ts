import type {
  ImageOcrResult,
  OcrWorkerRequest,
  OcrWorkerResponse,
} from "@/utils/image-translation/types"
import { browser } from "wxt/browser"

export class ImageOcrJobs {
  private pending = new Map<string, () => void>()

  run(tabId: number, id: string, image: string): Promise<ImageOcrResult> {
    const key = `${tabId}:${id}`
    if (this.pending.has(key)) return Promise.reject(new Error("IMAGE_REQUEST_DUPLICATED"))
    if (this.pending.size >= 2) return Promise.reject(new Error("IMAGE_OCR_BUSY"))
    return new Promise((resolve, reject) => {
      const worker = new Worker(browser.runtime.getURL("/image-ocr-worker.js"), { type: "module" })
      let settled = false
      const finish = () => {
        if (settled) return false
        settled = true
        clearTimeout(timeout)
        this.pending.delete(key)
        worker.terminate()
        return true
      }
      const cancel = () => {
        if (!finish()) return
        reject(new Error("IMAGE_CANCELLED"))
      }
      const timeout = setTimeout(() => {
        if (!finish()) return
        reject(new Error("IMAGE_OCR_TIMEOUT"))
      }, 120_000)
      this.pending.set(key, cancel)
      worker.onmessage = (event: MessageEvent<OcrWorkerResponse>) => {
        if (event.data.id !== id) return
        if (!finish()) return
        if (event.data.ok) resolve(event.data.result)
        else reject(new Error(event.data.error))
      }
      worker.onerror = (event) => {
        if (!finish()) return
        reject(new Error(event.message || "IMAGE_OCR_FAILED"))
      }
      const request: OcrWorkerRequest = {
        id,
        image,
        baseUrl: new URL("image-translation/", browser.runtime.getURL("/")).href,
      }
      try {
        worker.postMessage(request)
      } catch (cause) {
        finish()
        reject(cause)
      }
    })
  }
  cancel(tabId: number, id: string) {
    this.pending.get(`${tabId}:${id}`)?.()
  }
  cancelTab(tabId: number) {
    for (const [key, cancel] of this.pending) if (key.startsWith(`${tabId}:`)) cancel()
  }
}
