// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { UniversalVideoAdapter } from "../universal-adapter"

const mocks = vi.hoisted(() => ({
  getLocalConfig: vi.fn<(...args: any[]) => any>(),
}))

vi.mock("@/utils/config/storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/utils/config/storage")>()
  return {
    ...actual,
    getLocalConfig: mocks.getLocalConfig,
  }
})

vi.mock("@/utils/subtitles/toast", () => ({
  showSubtitlesErrorToast: vi.fn<(...args: any[]) => any>(),
  showAiSubtitlesWallToast: vi.fn<(...args: any[]) => any>(),
}))

vi.mock("@/utils/subtitles/processor/translator", () => ({
  buildSubtitlesSummaryContextHash: vi.fn<(...args: any[]) => any>(() => null),
  resolveSubtitlesProviderRef: vi.fn<(...args: any[]) => any>(),
  fetchSubtitlesSummary: vi.fn<(...args: any[]) => any>(),
  translateSubtitles: vi.fn<(...args: any[]) => any>(),
}))

const NAVIGATE_START = "test-navigate-start"
const NAVIGATE_FINISH = "test-navigate-finish"

function createAdapter() {
  const fetcher = {
    fetch: vi.fn<(...args: any[]) => any>().mockResolvedValue([]),
    cleanup: vi.fn<(...args: any[]) => any>(),
    shouldUseSameTrack: vi.fn<(...args: any[]) => any>().mockResolvedValue(false),
    getSourceLanguage: () => "en",
    hasAvailableSubtitles: vi.fn<(...args: any[]) => any>().mockResolvedValue(true),
  }
  const native = vi.fn<(...args: any[]) => any>(() => fetcher)

  const adapter = new UniversalVideoAdapter({
    config: {
      platform: "youtube",
      selectors: {
        video: "video",
        playerContainer: ".player",
        nativeSubtitles: ".native-subtitles",
      },
      events: { navigateStart: NAVIGATE_START, navigateFinish: NAVIGATE_FINISH },
      getVideoId: () => "video-1",
    },
    fetchers: { native },
  })

  return { adapter, fetcher, native }
}

describe("universalVideoAdapter destroy", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ""
    mocks.getLocalConfig.mockResolvedValue({
      language: {},
      providersConfig: [],
      videoSubtitles: {
        platforms: { youtube: "manual", xcom: "manual", netflix: "manual" },
        providerId: null,
      },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it("backs out of an initialize that resumes after destroy", async () => {
    document.body.innerHTML = '<div class="player"><video></video></div>'
    const { adapter } = createAdapter()
    const addEventListener = vi.spyOn(window, "addEventListener")

    const initializing = adapter.initialize()
    adapter.destroy()
    await initializing

    expect((adapter as any).subtitlesScheduler).toBeNull()
    expect(addEventListener).not.toHaveBeenCalledWith(NAVIGATE_START, expect.anything())
    expect(addEventListener).not.toHaveBeenCalledWith(NAVIGATE_FINISH, expect.anything())
  })
})
