import type { ImageOcrResult } from "./types"
import { getLocalConfig } from "@/utils/config/storage"
import { translateTextCore } from "@/utils/host/translate/translate-text"
import { sendMessage } from "@/utils/message"
import { resolvePageTranslationProvider } from "@/utils/providers/provider-ref"
import { renderImageTranslation } from "./render"

export type ImageTranslationStage = "recognizing" | "translating" | "rendering"

export async function translateCapturedImage(
  image: string,
  id: string,
  signal: AbortSignal,
  onStage: (stage: ImageTranslationStage, completed?: number, total?: number) => void,
) {
  const config = await getLocalConfig()
  if (!config) throw new Error("IMAGE_CONFIG_MISSING")
  const provider = resolvePageTranslationProvider(config)
  signal.throwIfAborted()
  onStage("recognizing")
  const ocr: ImageOcrResult = await sendMessage("recognizeImageTranslation", { id, image })
  signal.throwIfAborted()
  if (!ocr.blocks.length) throw new Error("IMAGE_NO_TEXT")
  const translations = new Map<number, string>()
  // Bound requests and stop scheduling immediately when the image task closes.
  for (const block of ocr.blocks) {
    signal.throwIfAborted()
    onStage("translating", translations.size, ocr.blocks.length)
    const text = await translateTextCore({
      text: block.text,
      langConfig: config.language,
      providerConfig: provider,
      feature: "pageTranslation",
      glossaryEnabled: config.glossary.enabled,
      enableAIContentAware: false,
      extraHashTags: ["imageTranslation"],
      preserveLineBreaks: true,
    })
    signal.throwIfAborted()
    if (!text.trim()) throw new Error("IMAGE_TRANSLATION_EMPTY")
    translations.set(block.id, text)
  }
  onStage("rendering")
  // Render only after all translations succeed, preserving the original on failure.
  const translated = await renderImageTranslation(image, ocr, translations)
  signal.throwIfAborted()
  return { image: translated }
}
