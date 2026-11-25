type ShowOriginal = () => (() => void) | undefined
interface Preview {
  show: ShowOriginal
  dismiss?: () => void
}

const previews = new WeakMap<EventTarget, Set<Preview>>()

/** Weak registrations preserve framework-owned nodes and share one preview across inline children. */
export function registerOriginalTextHover(
  elements: readonly HTMLElement[],
  show: ShowOriginal,
): () => void {
  const preview: Preview = { show }
  const targets = [...new Set(elements)]
  for (const target of targets) {
    const entries = previews.get(target) ?? new Set()
    entries.add(preview)
    previews.set(target, entries)
  }
  return () => {
    preview.dismiss?.()
    for (const target of targets) {
      const entries = previews.get(target)
      entries?.delete(preview)
      if (entries?.size === 0) previews.delete(target)
    }
  }
}

function containsPoint(bounds: DOMRect | undefined, event: MouseEvent): boolean {
  return (
    !!bounds &&
    bounds.width > 0 &&
    bounds.height > 0 &&
    event.clientX >= bounds.left &&
    event.clientX < bounds.right &&
    event.clientY >= bounds.top &&
    event.clientY < bounds.bottom
  )
}

/** Delegate hover without adding a listener to every translated paragraph. */
export function setupOriginalTextHover(ownerDoc: Document, initialEnabled: boolean) {
  let enabled = initialEnabled
  const active = new Map<Preview, (() => void) | undefined>()
  let boundary: EventTarget | undefined
  let bounds: DOMRect | undefined

  const hide = () => {
    for (const preview of active.keys()) preview.dismiss?.()
  }
  const move = (event: MouseEvent) => {
    // Retain the original hit area if changing language shortened the paragraph.
    // Otherwise a layout-induced mouseout could immediately undo the preview.
    if (!event.composedPath().includes(boundary!) && !containsPoint(bounds, event)) hide()
  }
  const show = (event: MouseEvent) => {
    if (!enabled) return
    const path = event.composedPath()
    if (active.size > 0 && !path.includes(boundary!) && containsPoint(bounds, event)) return
    const source = path.find((target) => previews.has(target))
    const entries = source ? previews.get(source)! : new Set<Preview>()
    if (entries.size === active.size && [...entries].every((preview) => active.has(preview))) return
    hide()
    if (entries.size === 0) return
    boundary = path.toReversed().find((target) => {
      const candidates = previews.get(target)
      return candidates?.size === entries.size && [...entries].every((p) => candidates.has(p))
    })
    bounds = (boundary as HTMLElement).getBoundingClientRect()
    for (const preview of entries) {
      active.set(preview, preview.show())
      preview.dismiss = () => {
        active.get(preview)?.()
        active.delete(preview)
        preview.dismiss = undefined
        if (active.size === 0) {
          ownerDoc.removeEventListener("mousemove", move, true)
          boundary = undefined
          bounds = undefined
        }
      }
    }
    ownerDoc.addEventListener("mousemove", move, true)
  }
  const leave = (event: MouseEvent) => {
    if (
      event.relatedTarget instanceof Node &&
      (boundary as HTMLElement | undefined)?.contains(event.relatedTarget)
    )
      return
    if (!containsPoint(bounds, event)) hide()
  }

  ownerDoc.addEventListener("mouseover", show, true)
  ownerDoc.addEventListener("mouseout", leave, true)
  ownerDoc.defaultView?.addEventListener("blur", hide)
  ownerDoc.addEventListener("visibilitychange", hide)
  return {
    setEnabled(value: boolean) {
      enabled = value
      if (!enabled) hide()
    },
    dispose() {
      hide()
      ownerDoc.removeEventListener("mouseover", show, true)
      ownerDoc.removeEventListener("mouseout", leave, true)
      ownerDoc.defaultView?.removeEventListener("blur", hide)
      ownerDoc.removeEventListener("visibilitychange", hide)
    },
  }
}
