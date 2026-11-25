import type { TranslationNodeStyleConfig } from "@/types/config/translate"
import { CUSTOM_TRANSLATION_NODE_ATTRIBUTE } from "@/utils/constants/translation-node-style"

const STYLE_ATTRIBUTE = `data-${CUSTOM_TRANSLATION_NODE_ATTRIBUTE}`
const STYLE_MARKER = "data-read-frog-translation-only-style"

interface StyleLease {
  owners: number
  previousStyle: string | null
  previousMarker: string | null
  appliedStyle: string
}

const leases = new WeakMap<HTMLElement, StyleLease>()

function restoreAttribute(element: HTMLElement, name: string, value: string | null): void {
  if (value === null) element.removeAttribute(name)
  else element.setAttribute(name, value)
}

function acquireStyle(element: HTMLElement, style: string): () => void {
  const lease = leases.get(element) ?? {
    owners: 0,
    previousStyle: element.getAttribute(STYLE_ATTRIBUTE),
    previousMarker: element.getAttribute(STYLE_MARKER),
    appliedStyle: style,
  }
  lease.owners++
  lease.appliedStyle = style
  leases.set(element, lease)
  element.setAttribute(STYLE_ATTRIBUTE, style)
  element.setAttribute(STYLE_MARKER, "")

  return () => {
    if (--lease.owners > 0) return
    if (element.getAttribute(STYLE_ATTRIBUTE) === lease.appliedStyle) {
      restoreAttribute(element, STYLE_ATTRIBUTE, lease.previousStyle)
    }
    if (element.getAttribute(STYLE_MARKER) === "") {
      restoreAttribute(element, STYLE_MARKER, lease.previousMarker)
    }
    leases.delete(element)
  }
}

/** Style existing parents: wrapping text nodes would break framework-owned removals. */
export function styleTranslationOnlyText(
  nodes: readonly Text[],
  config: TranslationNodeStyleConfig,
): () => void {
  const parents = [
    ...new Set(nodes.map((node) => node.parentElement).filter((parent) => parent !== null)),
  ]
  // A site's explicit link/span colour needs a local override. Box decorations
  // belong only to the outer target, so nested links do not acquire extra borders.
  const targets = ["textColor", "weakened"].includes(config.preset)
    ? parents
    : parents.filter(
        (element) => !parents.some((other) => other !== element && other.contains(element)),
      )
  const style = config.isCustom && config.customCSS ? "custom" : config.preset
  const release = targets.map((element) => acquireStyle(element, style))
  let released = false
  return () => {
    if (released) return
    released = true
    release.forEach((restore) => restore())
  }
}
