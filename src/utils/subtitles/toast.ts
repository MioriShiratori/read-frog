import type { ErrorAction } from "@/utils/error-action"
import { ToastPrimitive, toastManager } from "@/components/ui/base-ui/toast"
import { sendMessage } from "@/utils/message"

/**
 * The player's anchored toasts, rendered inside the player so they survive it
 * going fullscreen. The page's own anchored toasts, such as the floating
 * button's, share the content runtime's `anchoredToastManager` and must not
 * show up in here.
 */
export const subtitlesAnchoredToastManager: ReturnType<typeof ToastPrimitive.createToastManager> =
  ToastPrimitive.createToastManager()

/** Stable, so a double-click refreshes one toast instead of stacking two. */
const WALL_TOAST_ID = "read-frog-subtitles-wall"
/**
 * Longer than the shared defaults (5s docked, 3s anchored): this toast is the
 * only place the refusal is explained, and it asks the reader to aim at a
 * button rather than just acknowledge a line of text.
 */
const WALL_TOAST_TIMEOUT_MS = 10_000

function isAnchorVisible(element: HTMLElement | null): boolean {
  if (!element?.isConnected) {
    return false
  }
  const { width, height } = element.getBoundingClientRect()
  return width > 0 && height > 0
}

function show(title: string, action: ErrorAction | undefined, anchor: HTMLElement | null) {
  const manager = anchor ? subtitlesAnchoredToastManager : toastManager
  const toastId = manager.add({
    id: WALL_TOAST_ID,
    type: "error",
    title,
    timeout: WALL_TOAST_TIMEOUT_MS,
    // base-ui's positioner reads side/align off this; its defaults (top,
    // center) are what "above the button" means.
    ...(anchor && { positionerProps: { anchor, sideOffset: 8 } }),
    ...(action && {
      actionProps: {
        children: action.label,
        onClick: () => {
          manager.close(toastId)
          // Content scripts cannot use chrome.tabs — route through the background.
          void sendMessage("openPage", { url: action.url, active: true })
        },
      },
    }),
  })
}

/**
 * The one shape every subtitles denial takes: a sentence saying what happened,
 * plus an optional button the user chooses to press. Deliberately never
 * navigates on its own — stealing focus with a new tab in the middle of a
 * video is what this replaces.
 */
export function showSubtitlesErrorToast(title: string, action?: ErrorAction): void {
  show(title, action, null)
}

export function showAnchoredSubtitlesToast(
  title: string,
  anchor: HTMLElement | null,
  action?: ErrorAction,
): void {
  show(title, action, isAnchorVisible(anchor) ? anchor : null)
}
