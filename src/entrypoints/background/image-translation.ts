import { browser } from "wxt/browser"
import { captureTranslationImage } from "@/utils/image-translation/capture"
import { ImageOcrJobs } from "@/utils/image-translation/ocr-jobs"
import { onMessage } from "@/utils/message"

const jobs = new ImageOcrJobs()

export function setupImageTranslationHandlers() {
  onMessage("captureImageTranslation", async ({ data, sender }) => {
    const tab = sender.tab
    if (tab?.id === undefined || tab.windowId === undefined) throw new Error("IMAGE_TAB_MISSING")
    return captureTranslationImage(data, tab.id, tab.windowId)
  })
  onMessage("recognizeImageTranslation", ({ data, sender }) => {
    if (sender.tab?.id === undefined) throw new Error("IMAGE_TAB_MISSING")
    return jobs.run(sender.tab.id, data.id, data.image)
  })
  onMessage("cancelImageTranslation", ({ data, sender }) => {
    if (sender.tab?.id !== undefined) jobs.cancel(sender.tab.id, data.id)
  })
  browser.tabs.onRemoved.addListener((tabId) => {
    jobs.cancelTab(tabId)
  })
}
