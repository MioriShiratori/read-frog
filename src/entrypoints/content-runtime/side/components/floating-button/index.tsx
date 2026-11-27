import type { FloatingButtonSide } from "@/types/config/floating-button"
import { IconSettings } from "@tabler/icons-react"
import { useAtom, useAtomValue } from "jotai"
import { useEffect, useRef, useState } from "react"
import { useIsFullscreen } from "@/hooks/use-is-fullscreen"
import { ANALYTICS_FEATURE, ANALYTICS_SURFACE } from "@/types/analytics"
import { createFeatureUsageContext } from "@/utils/analytics"
import { configFieldsAtomMap } from "@/utils/atoms/config"
import { i18n } from "@/utils/i18n"
import { sendMessage } from "@/utils/message"
import { cn } from "@/utils/styles/utils"
import { urlMatchesPattern } from "@/utils/url-pattern"
import {
  enablePageTranslationAtom,
  isDraggingButtonAtom,
  isFloatingButtonHiddenUntilReloadAtom,
} from "../../atoms"
import { ImageTranslationButton } from "../image-translation"
import HiddenButton from "./components/hidden-button"
import { FloatingButtonCloseMenu, FloatingButtonLockControl } from "./controls"
import { MainFloatingButton } from "./main-button"
import TranslationHubButton from "./translation-hub-button"

const LONG_PRESS_DELAY_MS = 350
const DRAG_START_DISTANCE_PX = 6
const MIN_FLOATING_CONTAINER_TOP_PX = 30
const FLOATING_CONTAINER_BOTTOM_CLEARANCE_PX = 200

interface DragPoint {
  x: number
  y: number
}

interface PendingDragState {
  pointerId: number
  startClientX: number
  startClientY: number
  currentClientX: number
  currentClientY: number
  pointerOffsetX: number
  pointerOffsetY: number
  mainOffsetY: number
  buttonWidth: number
  buttonHeight: number
  hasActiveDrag: boolean
  longPressTimerId: number
}

function getFloatingButtonSide(side: string | undefined): FloatingButtonSide {
  return side === "left" ? "left" : "right"
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function getPointerDistance(startX: number, startY: number, currentX: number, currentY: number) {
  return Math.hypot(currentX - startX, currentY - startY)
}

function getDragPreviewPosition(pendingDrag: PendingDragState): DragPoint {
  return {
    x: clamp(
      pendingDrag.currentClientX - pendingDrag.pointerOffsetX,
      0,
      Math.max(0, window.innerWidth - pendingDrag.buttonWidth),
    ),
    y: clamp(
      pendingDrag.currentClientY - pendingDrag.pointerOffsetY,
      0,
      Math.max(0, window.innerHeight - pendingDrag.buttonHeight),
    ),
  }
}

function getNormalizedFloatingContainerTop(mainButtonTop: number, mainOffsetY: number) {
  const viewportHeight = Math.max(1, window.innerHeight)
  const maxTop = Math.max(
    MIN_FLOATING_CONTAINER_TOP_PX,
    viewportHeight - FLOATING_CONTAINER_BOTTOM_CLEARANCE_PX,
  )
  const containerTop = clamp(mainButtonTop - mainOffsetY, MIN_FLOATING_CONTAINER_TOP_PX, maxTop)
  return containerTop / viewportHeight
}

export default function FloatingButton() {
  const [floatingButton, setFloatingButton] = useAtom(configFieldsAtomMap.floatingButton)
  const translationState = useAtomValue(enablePageTranslationAtom)
  const [isDraggingButton, setIsDraggingButton] = useAtom(isDraggingButtonAtom)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isHitAreaExpanded, setIsHitAreaExpanded] = useState(false)
  const [dragPreviewPosition, setDragPreviewPosition] = useState<DragPoint | null>(null)
  const isFullscreen = useIsFullscreen()
  const isHiddenUntilReload = useAtomValue(isFloatingButtonHiddenUntilReloadAtom)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mainButtonRef = useRef<HTMLDivElement | null>(null)
  const pendingDragRef = useRef<PendingDragState | null>(null)
  const lastDragPreviewRef = useRef<DragPoint | null>(null)
  const isFloatingButtonLocked = floatingButton.locked
  const floatingButtonSide = getFloatingButtonSide(floatingButton.side)
  const isFloatingButtonExpanded = isHitAreaExpanded || isDropdownOpen
  const isMainButtonAttached = isFloatingButtonLocked || isFloatingButtonExpanded

  useEffect(() => {
    if (!isDraggingButton) return undefined

    const previousUserSelect = document.body.style.userSelect
    const previousCursor = document.body.style.cursor
    document.body.style.userSelect = "none"
    document.body.style.cursor = "grabbing"

    return () => {
      document.body.style.userSelect = previousUserSelect
      document.body.style.cursor = previousCursor
    }
  }, [isDraggingButton])

  useEffect(() => {
    return () => {
      const pendingDrag = pendingDragRef.current
      if (pendingDrag) {
        window.clearTimeout(pendingDrag.longPressTimerId)
      }
    }
  }, [])

  // Going fullscreen removes the button from the DOM, so an in-flight drag can
  // never receive its pointerup: cancel it here, or the body keeps the grabbing
  // cursor and the text-selection lock after fullscreen exits.
  useEffect(() => {
    if (!isFullscreen) return

    const pendingDrag = pendingDragRef.current
    if (pendingDrag) {
      window.clearTimeout(pendingDrag.longPressTimerId)
      pendingDragRef.current = null
    }
    lastDragPreviewRef.current = null
    // oxlint-disable-next-line react/set-state-in-effect -- clears the drag preview once the drag ends
    setDragPreviewPosition(null)
    setIsDraggingButton(false)
    setIsHitAreaExpanded(false)
    setIsDropdownOpen(false)
  }, [isFullscreen, setIsDraggingButton])

  const handleFloatingButtonClick = () => {
    const nextEnabled = !translationState.enabled
    void sendMessage("tryToSetEnablePageTranslationOnContentScript", {
      enabled: nextEnabled,
      analyticsContext: nextEnabled
        ? createFeatureUsageContext(
            ANALYTICS_FEATURE.PAGE_TRANSLATION,
            ANALYTICS_SURFACE.FLOATING_BUTTON,
          )
        : undefined,
    })
  }

  const startActiveDrag = () => {
    const pendingDrag = pendingDragRef.current
    if (!pendingDrag || pendingDrag.hasActiveDrag) return

    pendingDrag.hasActiveDrag = true
    const nextPreviewPosition = getDragPreviewPosition(pendingDrag)
    lastDragPreviewRef.current = nextPreviewPosition
    setDragPreviewPosition(nextPreviewPosition)
    setIsHitAreaExpanded(false)
    setIsDropdownOpen(false)
    setIsDraggingButton(true)
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return

    const mainButton = mainButtonRef.current ?? e.currentTarget
    const mainButtonRect = mainButton.getBoundingClientRect()
    const containerRect = containerRef.current?.getBoundingClientRect()
    const mainOffsetY = containerRect ? mainButtonRect.top - containerRect.top : 0

    e.preventDefault()
    if (typeof e.currentTarget.setPointerCapture === "function") {
      e.currentTarget.setPointerCapture(e.pointerId)
    }

    pendingDragRef.current = {
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      currentClientX: e.clientX,
      currentClientY: e.clientY,
      pointerOffsetX: e.clientX - mainButtonRect.left,
      pointerOffsetY: e.clientY - mainButtonRect.top,
      mainOffsetY,
      buttonWidth: mainButtonRect.width || 40,
      buttonHeight: mainButtonRect.height || 40,
      hasActiveDrag: false,
      longPressTimerId: window.setTimeout(startActiveDrag, LONG_PRESS_DELAY_MS),
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const pendingDrag = pendingDragRef.current
    if (!pendingDrag || pendingDrag.pointerId !== e.pointerId) return

    pendingDrag.currentClientX = e.clientX
    pendingDrag.currentClientY = e.clientY

    if (!pendingDrag.hasActiveDrag) {
      const pointerDistance = getPointerDistance(
        pendingDrag.startClientX,
        pendingDrag.startClientY,
        e.clientX,
        e.clientY,
      )
      if (pointerDistance > DRAG_START_DISTANCE_PX) {
        startActiveDrag()
      }
    }

    if (pendingDrag.hasActiveDrag) {
      const nextPreviewPosition = getDragPreviewPosition(pendingDrag)
      lastDragPreviewRef.current = nextPreviewPosition
      setDragPreviewPosition(nextPreviewPosition)
    }
  }

  const finishPointerInteraction = (
    e: React.PointerEvent<HTMLDivElement>,
    shouldTriggerClick: boolean,
  ) => {
    const pendingDrag = pendingDragRef.current
    if (!pendingDrag || pendingDrag.pointerId !== e.pointerId) return

    window.clearTimeout(pendingDrag.longPressTimerId)
    pendingDragRef.current = null

    if (typeof e.currentTarget.releasePointerCapture === "function") {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }

    if (pendingDrag.hasActiveDrag) {
      const finalPreviewPosition = lastDragPreviewRef.current ?? getDragPreviewPosition(pendingDrag)
      const finalCenterX = finalPreviewPosition.x + pendingDrag.buttonWidth / 2
      const nextSide: FloatingButtonSide = finalCenterX < window.innerWidth / 2 ? "left" : "right"
      const nextPosition = getNormalizedFloatingContainerTop(
        finalPreviewPosition.y,
        pendingDrag.mainOffsetY,
      )

      lastDragPreviewRef.current = null
      setDragPreviewPosition(null)
      void setFloatingButton({ position: nextPosition, side: nextSide })
      setIsDraggingButton(false)
      return
    }

    lastDragPreviewRef.current = null
    setDragPreviewPosition(null)
    setIsDraggingButton(false)

    if (shouldTriggerClick) {
      handleFloatingButtonClick()
    }
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    finishPointerInteraction(e, true)
  }

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    finishPointerInteraction(e, false)
  }

  const handleMouseEnter = () => {
    if (!isDraggingButton) {
      setIsHitAreaExpanded(true)
    }
  }

  const handleMouseLeave = () => {
    if (!isDropdownOpen && !isDraggingButton) {
      setIsHitAreaExpanded(false)
    }
  }

  if (
    isFullscreen ||
    isHiddenUntilReload ||
    !floatingButton.enabled ||
    floatingButton.disabledFloatingButtonPatterns.some((pattern) =>
      urlMatchesPattern(window.location.href, pattern),
    )
  ) {
    return null
  }

  const containerStyle: React.CSSProperties =
    isDraggingButton && dragPreviewPosition
      ? {
          left: `${dragPreviewPosition.x}px`,
          right: "auto",
          top: `${dragPreviewPosition.y}px`,
        }
      : {
          left: floatingButtonSide === "left" ? "0px" : undefined,
          right:
            floatingButtonSide === "right" ? "var(--removed-body-scroll-bar-size, 0px)" : undefined,
          top: `${floatingButton.position * 100}vh`,
        }

  return (
    <div
      ref={containerRef}
      data-testid="floating-button-container"
      className={cn(
        "fixed z-2147483647 flex flex-col gap-2 print:hidden",
        isFloatingButtonExpanded ? "pointer-events-auto" : "pointer-events-none",
        isDraggingButton
          ? "items-center"
          : floatingButtonSide === "right"
            ? "items-end"
            : "items-start",
        !isDraggingButton &&
          isFloatingButtonExpanded &&
          (floatingButtonSide === "right" ? "pl-6" : "pr-6"),
      )}
      style={containerStyle}
      onMouseLeave={handleMouseLeave}
    >
      {!isDraggingButton && (
        <TranslationHubButton side={floatingButtonSide} expanded={isFloatingButtonExpanded} />
      )}
      <ImageTranslationButton
        side={floatingButtonSide}
        expanded={isFloatingButtonExpanded}
        dragging={isDraggingButton}
      />
      <div className="relative">
        <MainFloatingButton
          ref={mainButtonRef}
          side={floatingButtonSide}
          dragging={isDraggingButton}
          attached={isMainButtonAttached}
          expanded={isFloatingButtonExpanded}
          translated={translationState.enabled}
          pointerHandlers={{
            onPointerDown: handlePointerDown,
            onPointerMove: handlePointerMove,
            onPointerUp: handlePointerUp,
            onPointerCancel: handlePointerCancel,
          }}
          onMouseEnter={handleMouseEnter}
          onTranslate={handleFloatingButtonClick}
        />

        {!isDraggingButton && (
          <>
            <FloatingButtonCloseMenu
              expanded={isFloatingButtonExpanded}
              side={floatingButtonSide}
              onDropdownOpenChange={setIsDropdownOpen}
            />
            <FloatingButtonLockControl
              expanded={isFloatingButtonExpanded}
              side={floatingButtonSide}
            />
          </>
        )}
      </div>
      {!isDraggingButton && (
        <HiddenButton
          side={floatingButtonSide}
          expanded={isFloatingButtonExpanded}
          icon={<IconSettings className="h-5 w-5" />}
          label={i18n.t("options.floatingButton.tooltips.settings")}
          onClick={() => {
            void sendMessage("openOptionsPage", undefined)
          }}
        />
      )}
    </div>
  )
}
