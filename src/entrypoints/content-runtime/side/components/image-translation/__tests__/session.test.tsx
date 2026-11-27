// @vitest-environment jsdom
import type { translateCapturedImage } from "@/utils/image-translation/pipeline"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { shadowWrapper } from "../../../main"
import { ImageTranslationSession } from "../session"

const mocks = vi.hoisted(() => ({
  capture: vi.fn<() => Promise<string>>(),
  cancel: vi.fn<() => Promise<void>>(),
  translate: vi.fn<typeof translateCapturedImage>(),
}))
vi.mock("../../../main", () => {
  const fixtureHost = document.createElement("div")
  const shadow = fixtureHost.attachShadow({ mode: "open" })
  const wrapper = document.createElement("div")
  shadow.append(wrapper)
  return { shadowWrapper: wrapper }
})
vi.mock("@/utils/message", () => ({
  sendMessage: (name: string) =>
    name === "cancelImageTranslation" ? mocks.cancel() : mocks.capture(),
}))
vi.mock("@/utils/image-translation/pipeline", () => ({ translateCapturedImage: mocks.translate }))
vi.mock("@/utils/i18n", () => ({ i18n: { t: (key: string) => key } }))
vi.mock("../selection", () => ({
  ImageSelectionLayer: ({
    onSelect,
  }: {
    onSelect: (selection: {
      rect: { x: number; y: number; width: number; height: number }
      scrollX: number
      scrollY: number
    }) => void
  }) => (
    <button
      type="button"
      onClick={() =>
        onSelect({ rect: { x: 0, y: 0, width: 100, height: 80 }, scrollX: 0, scrollY: 0 })
      }
    >
      select fixture
    </button>
  ),
}))
vi.mock("../result", () => ({
  ImageTranslationResult: () => <div data-testid="completed-image" />,
}))

function host() {
  const root = shadowWrapper?.getRootNode()
  if (!(root instanceof ShadowRoot) || !(root.host instanceof HTMLElement))
    throw new Error("Missing fixture host")
  return root.host
}
beforeEach(() => {
  vi.clearAllMocks()
  host().style.visibility = "visible"
  document.body.append(host())
  mocks.translate.mockResolvedValue({ image: "translated" })
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0)
    return 1
  })
})
afterEach(() => {
  cleanup()
  host().remove()
  vi.unstubAllGlobals()
})

it("hides extension UI only during capture and restores its existing visibility", async () => {
  const capture = Promise.withResolvers<string>()
  mocks.capture.mockReturnValue(capture.promise)
  render(<ImageTranslationSession mode="area" onClose={() => {}} />)
  fireEvent.click(screen.getByText("select fixture"))
  await waitFor(() => expect(mocks.capture).toHaveBeenCalledOnce())
  expect(host().style.visibility).toBe("hidden")
  await act(async () => capture.resolve("pixels"))
  await screen.findByTestId("completed-image")
  expect(host().style.visibility).toBe("visible")
  expect(mocks.translate).toHaveBeenCalledWith(
    "pixels",
    expect.any(String),
    expect.any(AbortSignal),
    expect.any(Function),
  )
})

it("restores the capture UI on failure and exposes a retryable error", async () => {
  mocks.capture.mockRejectedValue(new Error("capture failed"))
  render(<ImageTranslationSession mode="area" onClose={() => {}} />)
  fireEvent.click(screen.getByText("select fixture"))
  expect(await screen.findByRole("alert")).toHaveTextContent("capture failed")
  expect(host().style.visibility).toBe("visible")
  expect(mocks.translate).not.toHaveBeenCalled()
})

it("cancels recognition and discards a capture that finishes after closing", async () => {
  const capture = Promise.withResolvers<string>()
  mocks.capture.mockReturnValue(capture.promise)
  const view = render(<ImageTranslationSession mode="area" onClose={() => {}} />)
  fireEvent.click(screen.getByText("select fixture"))
  await waitFor(() => expect(mocks.capture).toHaveBeenCalledOnce())
  view.unmount()
  expect(mocks.cancel).toHaveBeenCalledOnce()
  await act(async () => capture.resolve("pixels"))
  expect(mocks.translate).not.toHaveBeenCalled()
  expect(host().style.visibility).toBe("visible")
})

it("closes an active session on SPA navigation", async () => {
  vi.useFakeTimers()
  const previous = location.href
  const onClose = vi.fn<() => void>()
  const view = render(<ImageTranslationSession mode="area" onClose={onClose} />)
  try {
    history.pushState({}, "", "/image-test-navigation")
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250)
    })
    expect(onClose).toHaveBeenCalledOnce()
  } finally {
    view.unmount()
    history.replaceState({}, "", previous)
    vi.useRealTimers()
  }
})
