import type { Rect } from "@/utils/image-translation/types"
import { useRef, useState } from "react"
import { i18n } from "@/utils/i18n"

export interface ImageSelection {
  rect: Rect
  element?: HTMLImageElement
  url?: string
  scrollX: number
  scrollY: number
}

export function ImageSelectionLayer({
  mode,
  onSelect,
}: {
  mode: "area" | "image"
  onSelect: (selection: ImageSelection) => void
}) {
  const start = useRef<{ x: number; y: number } | null>(null)
  const [rect, setRect] = useState<Rect | null>(null)
  const pointerMove = (event: React.PointerEvent) => {
    if (mode === "image") {
      setRect(imageAt(event.clientX, event.clientY)?.getBoundingClientRect() ?? null)
    } else if (start.current)
      setRect(selectionRect(start.current, { x: event.clientX, y: event.clientY }))
  }
  const finish = (event: React.PointerEvent) => {
    event.preventDefault()
    event.stopPropagation()
    if (mode === "area" && start.current) {
      const selected = selectionRect(start.current, { x: event.clientX, y: event.clientY })
      if (selected.width >= 8 && selected.height >= 8)
        onSelect({ rect: selected, scrollX: window.scrollX, scrollY: window.scrollY })
    } else if (mode === "image") {
      const element = imageAt(event.clientX, event.clientY)
      if (element)
        onSelect({
          rect: element.getBoundingClientRect(),
          element,
          url: element.currentSrc || element.src,
          scrollX: window.scrollX,
          scrollY: window.scrollY,
        })
    }
    start.current = null
  }
  return (
    <div
      data-testid="image-translation-selection"
      className="pointer-events-auto fixed inset-0 z-2147483647 cursor-crosshair touch-none select-none"
      onPointerMove={pointerMove}
      onPointerDown={(event) => {
        event.preventDefault()
        event.stopPropagation()
        start.current = { x: event.clientX, y: event.clientY }
        event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onPointerUp={finish}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
      }}
    >
      <div className="pointer-events-none fixed top-4 left-1/2 -translate-x-1/2 rounded-md bg-neutral-950 px-4 py-2 text-sm text-white shadow-lg">
        {i18n.t(mode === "area" ? "imageTranslation.selectArea" : "imageTranslation.selectImage")}
      </div>
      {rect && (
        <div
          className="pointer-events-none fixed border-2 border-blue-500 bg-blue-500/10"
          style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
        />
      )}
    </div>
  )
}

function imageAt(x: number, y: number): HTMLImageElement | undefined {
  return document
    .elementsFromPoint(x, y)
    .find(
      (element): element is HTMLImageElement =>
        element instanceof HTMLImageElement && element.naturalWidth > 0,
    )
}

export function selectionRect(
  start: { x: number; y: number },
  end: { x: number; y: number },
  bounds = { width: innerWidth, height: innerHeight },
): Rect {
  start = {
    x: Math.max(0, Math.min(bounds.width, start.x)),
    y: Math.max(0, Math.min(bounds.height, start.y)),
  }
  end = {
    x: Math.max(0, Math.min(bounds.width, end.x)),
    y: Math.max(0, Math.min(bounds.height, end.y)),
  }
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  }
}
