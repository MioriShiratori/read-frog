import type { ImageSelection } from "./selection"
import { useLayoutEffect, useState } from "react"

export function ImageTranslationResult({
  selection,
  image,
  original,
  showOriginal,
  onClose,
}: {
  selection: ImageSelection
  image: string
  original: string
  showOriginal: boolean
  onClose: () => void
}) {
  const [rect, setRect] = useState(selection.rect)
  useLayoutEffect(() => {
    const update = () => {
      const element = selection.element
      if (element) {
        if (!element.isConnected || (element.currentSrc || element.src) !== selection.url) {
          onClose()
          return
        }
        setRect(element.getBoundingClientRect())
      } else
        setRect({
          ...selection.rect,
          x: selection.rect.x + selection.scrollX - window.scrollX,
          y: selection.rect.y + selection.scrollY - window.scrollY,
        })
    }
    const resize = new ResizeObserver(update)
    const mutation = new MutationObserver(update)
    if (selection.element) {
      resize.observe(selection.element)
      mutation.observe(selection.element, {
        attributes: true,
        attributeFilter: ["src", "srcset", "style", "class"],
      })
    }
    window.addEventListener("scroll", update, true)
    window.addEventListener("resize", update)
    update()
    return () => {
      resize.disconnect()
      mutation.disconnect()
      window.removeEventListener("scroll", update, true)
      window.removeEventListener("resize", update)
    }
  }, [selection, onClose])
  const style = selection.element ? getComputedStyle(selection.element) : undefined
  return (
    <img
      data-testid="image-translation-result"
      alt=""
      draggable={false}
      src={showOriginal ? original : image}
      className="pointer-events-none fixed z-2147483646 m-0 block max-w-none! border-0 p-0"
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
        objectFit: objectFit(style?.objectFit),
        objectPosition: style?.objectPosition,
        borderRadius: style?.borderRadius,
      }}
    />
  )
}

function objectFit(value?: string) {
  if (value === "contain" || value === "cover" || value === "none" || value === "scale-down")
    return value
  return "fill"
}
