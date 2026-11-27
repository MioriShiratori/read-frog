import { i18n } from "@/utils/i18n"

const errorMessages = {
  IMAGE_NO_TEXT: "imageTranslation.errors.noText",
  IMAGE_TOO_LARGE: "imageTranslation.errors.large",
  CAPTURE_TAB_CHANGED: "imageTranslation.errors.tabChanged",
  IMAGE_URL_UNSUPPORTED: "imageTranslation.errors.unsupported",
  IMAGE_FETCH_FAILED: "imageTranslation.errors.unsupported",
  IMAGE_OCR_BUSY: "imageTranslation.errors.busy",
  IMAGE_OCR_TIMEOUT: "imageTranslation.errors.timeout",
  IMAGE_TRANSLATION_EMPTY: "imageTranslation.errors.empty",
  IMAGE_TRANSLATION_TOO_LONG: "imageTranslation.errors.tooLong",
} as const

export function imageTranslationError(message: string): string {
  const match = Object.entries(errorMessages).find(([code]) => message.includes(code))
  return match ? i18n.t(match[1]) : message
}
