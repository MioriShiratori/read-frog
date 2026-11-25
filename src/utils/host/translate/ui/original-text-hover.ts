interface OriginalTextEntry {
  sources: Map<symbol, string>
  dismiss?: () => void
}

// Weak keys let framework-owned subtrees disappear without retaining their text.
const originals = new WeakMap<EventTarget, OriginalTextEntry>()

/** Registers plain original text without wrapping or replacing site-owned nodes. */
export function registerOriginalTextHover(
  elements: readonly HTMLElement[],
  originalText: string,
): () => void {
  const key = Symbol()
  const targets = [...new Set(elements)]
  for (const element of targets) {
    const entry = originals.get(element) ?? { sources: new Map() }
    entry.sources.set(key, originalText)
    originals.set(element, entry)
  }
  return () => {
    for (const element of targets) {
      const entry = originals.get(element)
      if (!entry?.sources.delete(key)) continue
      entry.dismiss?.()
      if (entry.sources.size === 0) originals.delete(element)
    }
  }
}

/** One event pair per document, independent of translated paragraph count. */
export function setupOriginalTextHover(ownerDoc: Document, initialEnabled: boolean) {
  let enabled = initialEnabled
  let dismiss: (() => void) | undefined

  const hide = () => dismiss?.()
  const show = (event: MouseEvent) => {
    hide()
    if (!enabled) return
    // composedPath reaches translated nodes inside open shadow roots as well.
    const path = event.composedPath()
    const source = path.find((target) => originals.has(target))
    if (!source) return
    // A descendant's own title overrides its ancestor's native tooltip.
    const element = path.find((target): target is Element => target instanceof Element)!
    const entry = originals.get(source)!
    const originalText = [...new Set(entry.sources.values())].join("\n\n")
    const previousTitle = element.getAttribute("title")
    element.setAttribute("title", originalText)
    dismiss = () => {
      // Host writes while hovered belong to the host, not to our restore path.
      if (element.getAttribute("title") === originalText) {
        if (previousTitle === null) element.removeAttribute("title")
        else element.setAttribute("title", previousTitle)
      }
      entry.dismiss = undefined
      dismiss = undefined
    }
    entry.dismiss = dismiss
  }

  ownerDoc.addEventListener("mouseover", show, true)
  ownerDoc.addEventListener("mouseout", hide, true)
  return {
    setEnabled(value: boolean) {
      enabled = value
      hide()
    },
    dispose() {
      hide()
      ownerDoc.removeEventListener("mouseover", show, true)
      ownerDoc.removeEventListener("mouseout", hide, true)
    },
  }
}
