import type { OcrWorkerRequest, OcrWorkerResponse } from "@/utils/image-translation/types"
import { defineUnlistedScript } from "#imports"
import { recognizeImage } from "@/utils/image-translation/ocr/engine"

export default defineUnlistedScript(() => {
  self.onmessage = async (event: MessageEvent<OcrWorkerRequest>) => {
    const { id, image, baseUrl } = event.data
    let response: OcrWorkerResponse
    try {
      const blob = await (await fetch(image)).blob()
      response = { id, ok: true, result: await recognizeImage(blob, baseUrl) }
    } catch (error) {
      response = { id, ok: false, error: error instanceof Error ? error.message : String(error) }
    }
    self.postMessage(response)
  }
})
