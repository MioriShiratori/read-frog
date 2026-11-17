import { beforeEach, describe, expect, it, vi } from "vitest"
import { DEFAULT_PROVIDER_CONFIG } from "@/utils/constants/providers"
import { sendMessage } from "@/utils/message"
import { getOrGenerateWebPageSummary } from "../webpage-summary"

vi.mock("@/utils/message", () => ({ sendMessage: vi.fn<typeof sendMessage>() }))
const providerRef = { kind: "local" as const, config: DEFAULT_PROVIDER_CONFIG.openai }
const context = {
  url: "https://example.com/article",
  webTitle: "Page title",
  webContent: "Page body",
}
beforeEach(() => vi.clearAllMocks())

describe("page context summary", () => {
  it("forwards the chosen model snapshot to the background", async () => {
    vi.mocked(sendMessage).mockResolvedValue("Article summary")
    await expect(getOrGenerateWebPageSummary(context, providerRef, true)).resolves.toBe(
      "Article summary",
    )
    expect(sendMessage).toHaveBeenCalledWith("getOrGenerateWebPageSummary", {
      webTitle: context.webTitle,
      webContent: context.webContent,
      providerRef,
    })
  })
  it("does not request optional summaries when disabled or missing page content", async () => {
    await expect(getOrGenerateWebPageSummary(context, providerRef, false)).resolves.toBeNull()
    await expect(getOrGenerateWebPageSummary(null, providerRef, true)).resolves.toBeNull()
    await expect(
      getOrGenerateWebPageSummary({ ...context, webTitle: " " }, providerRef, true),
    ).resolves.toBeNull()
    await expect(
      getOrGenerateWebPageSummary({ ...context, webContent: " " }, providerRef, true),
    ).resolves.toBeNull()
    expect(sendMessage).not.toHaveBeenCalled()
  })
})
