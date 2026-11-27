import { useEffect, useId, useRef, useState } from "react"
import { Button } from "@/components/ui/base-ui/button"
import { i18n } from "@/utils/i18n"
import { imageTranslationError } from "@/utils/image-translation/errors"
import { translateCapturedImage } from "@/utils/image-translation/pipeline"
import { sendMessage } from "@/utils/message"
import { shadowWrapper } from "../../main"
import { ImageTranslationResult } from "./result"
import { ImageSelectionLayer, selectionRect, type ImageSelection } from "./selection"

type Stage =
  | "selecting"
  | "capturing"
  | "recognizing"
  | "translating"
  | "rendering"
  | "done"
  | "error"

const hiddenHosts = new WeakMap<HTMLElement, { count: number; visibility: string }>()

async function withoutUi<T>(work: () => Promise<T>): Promise<T> {
  const root = shadowWrapper?.getRootNode()
  const host =
    root instanceof ShadowRoot && root.host instanceof HTMLElement ? root.host : undefined
  if (host) {
    const lease = hiddenHosts.get(host) ?? { count: 0, visibility: host.style.visibility }
    lease.count++
    hiddenHosts.set(host, lease)
    host.style.visibility = "hidden"
  }
  try {
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    )
    return await work()
  } finally {
    const lease = host && hiddenHosts.get(host)
    if (host && lease && --lease.count === 0) {
      host.style.visibility = lease.visibility
      hiddenHosts.delete(host)
    }
  }
}

export function ImageTranslationSession({
  mode,
  onClose,
}: {
  mode: "area" | "image"
  onClose: () => void
}) {
  const [stage, setStage] = useState<Stage>("selecting")
  const [selection, setSelection] = useState<ImageSelection | null>(null)
  const [original, setOriginal] = useState("")
  const [result, setResult] = useState("")
  const [error, setError] = useState("")
  const [progress, setProgress] = useState("")
  const [showOriginal, setShowOriginal] = useState(false)
  const sessionId = useId()
  const task = useRef({ id: sessionId, abort: new AbortController() })
  useEffect(() => {
    const current = task.current
    const close = () => onClose()
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        event.stopPropagation()
        close()
      }
    }
    window.addEventListener("keydown", keydown, true)
    window.addEventListener("pagehide", close)
    window.addEventListener("popstate", close)
    return () => {
      current.abort.abort()
      void sendMessage("cancelImageTranslation", { id: current.id })
      window.removeEventListener("keydown", keydown, true)
      window.removeEventListener("pagehide", close)
      window.removeEventListener("popstate", close)
    }
  }, [onClose])
  useEffect(() => {
    const url = location.href
    const timer = window.setInterval(() => {
      if (location.href !== url) {
        onClose()
        return
      }
      const element = selection?.element
      if (
        element &&
        (!element.isConnected || (element.currentSrc || element.src) !== selection.url)
      )
        onClose()
    }, 250)
    return () => window.clearInterval(timer)
  }, [selection, onClose])
  useEffect(() => {
    if (!selection || selection.element) return undefined
    // A screenshot has no DOM anchor inside independently scrolling containers.
    const scroll = (event: Event) => {
      if (event.target !== document && event.target !== window) onClose()
    }
    window.addEventListener("scroll", scroll, true)
    window.addEventListener("resize", onClose)
    return () => {
      window.removeEventListener("scroll", scroll, true)
      window.removeEventListener("resize", onClose)
    }
  }, [selection, onClose])
  const run = async (selected: ImageSelection) => {
    const { signal } = task.current.abort
    setSelection(selected)
    setStage("capturing")
    setError("")
    try {
      const capture = () =>
        sendMessage(
          "captureImageTranslation",
          selected.url
            ? { kind: "image", url: selected.url }
            : {
                kind: "area",
                rect: selected.rect,
                viewport: { width: innerWidth, height: innerHeight },
              },
        )
      const image = selected.url ? await capture() : await withoutUi(capture)
      signal.throwIfAborted()
      setOriginal(image)
      const translated = await translateCapturedImage(
        image,
        task.current.id,
        signal,
        (next, completed, total) => {
          setStage(next)
          setProgress(total === undefined ? "" : `${completed}/${total}`)
        },
      )
      signal.throwIfAborted()
      setResult(translated.image)
      setStage("done")
    } catch (cause) {
      if (signal.aborted) return
      setError(imageTranslationError(cause instanceof Error ? cause.message : String(cause)))
      setStage("error")
    }
  }
  return (
    <>
      {stage === "selecting" && (
        <ImageSelectionLayer mode={mode} onSelect={(selected) => void run(selected)} />
      )}
      {stage === "done" && selection && (
        <ImageTranslationResult
          selection={selection}
          image={result}
          original={original}
          showOriginal={showOriginal}
          onClose={onClose}
        />
      )}
      {(stage !== "capturing" || selection?.url) && (
        <div
          data-testid="image-translation-status"
          className="pointer-events-auto fixed top-4 right-4 z-2147483647 flex max-w-sm flex-col gap-3 rounded-lg border border-border bg-background p-4 text-sm text-foreground shadow-lg"
        >
          <div className="flex items-center justify-between gap-4">
            <strong>{i18n.t("imageTranslation.title")}</strong>
            <Button size="sm" variant="ghost" onClick={onClose}>
              {i18n.t(stage === "done" ? "imageTranslation.restore" : "imageTranslation.cancel")}
            </Button>
          </div>
          <p role="status">
            {i18n.t(`imageTranslation.stages.${stage}`)} {progress}
          </p>
          <p className="text-xs text-muted-foreground">{i18n.t("imageTranslation.providerHint")}</p>
          {stage === "done" && (
            <Button size="sm" variant="outline" onClick={() => setShowOriginal((value) => !value)}>
              {i18n.t(
                showOriginal ? "imageTranslation.showTranslation" : "imageTranslation.showOriginal",
              )}
            </Button>
          )}
          {stage === "error" && (
            <>
              <p role="alert" className="max-h-24 overflow-auto break-words">
                {error}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    if (selection) void run(selection)
                  }}
                >
                  {i18n.t("imageTranslation.retry")}
                </Button>
                {selection?.element && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (selection) {
                        const { x, y, width, height } =
                          selection.element?.getBoundingClientRect() ?? selection.rect
                        void run({
                          ...selection,
                          element: undefined,
                          url: undefined,
                          rect: selectionRect({ x, y }, { x: x + width, y: y + height }),
                        })
                      }
                    }}
                  >
                    {i18n.t("imageTranslation.visibleArea")}
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
