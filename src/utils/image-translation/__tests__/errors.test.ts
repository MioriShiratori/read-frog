import { expect, it, vi } from "vitest"
import { imageTranslationError } from "../errors"

vi.mock("@/utils/i18n", () => ({ i18n: { t: (key: string) => `localized ${key}` } }))

it("turns recognition timeout codes into user-facing localized guidance", () => {
  const message = imageTranslationError("Error: IMAGE_OCR_TIMEOUT")
  expect(message).toContain("localized ")
  expect(message).not.toContain("IMAGE_OCR_TIMEOUT")
})

it("preserves actionable provider errors that have no local error code", () => {
  expect(imageTranslationError("Provider HTTP 429: rate limited")).toBe(
    "Provider HTTP 429: rate limited",
  )
})
