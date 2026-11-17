import type { HTMLAttributes, Ref } from "react"
import type { FloatingButtonSide } from "@/types/config/floating-button"
import { browser } from "#imports"
import readFrogLogo from "@/assets/icons/read-frog.png?url&no-inline"
import { APP_NAME } from "@/utils/constants/app"
import { i18n } from "@/utils/i18n"
import { cn } from "@/utils/styles/utils"

const readFrogLogoUrl = new URL(readFrogLogo, browser.runtime.getURL("/")).href

type PointerHandlers = Pick<
  HTMLAttributes<HTMLDivElement>,
  "onPointerDown" | "onPointerMove" | "onPointerUp" | "onPointerCancel"
>

export function MainFloatingButton({
  ref,
  side,
  dragging,
  attached,
  expanded,
  translated,
  pointerHandlers,
  onMouseEnter,
  onTranslate,
}: {
  ref: Ref<HTMLDivElement>
  side: FloatingButtonSide
  dragging: boolean
  attached: boolean
  expanded: boolean
  translated: boolean
  pointerHandlers: PointerHandlers
  onMouseEnter: () => void
  onTranslate: () => void
}) {
  return (
    <div
      ref={ref}
      data-testid="floating-main-button"
      role={dragging ? undefined : "button"}
      tabIndex={dragging ? -1 : 0}
      aria-label={i18n.t("options.floatingButton.tooltips.togglePageTranslation")}
      aria-pressed={translated}
      onKeyDown={(event) => {
        if (dragging || event.repeat || (event.key !== "Enter" && event.key !== " ")) return
        event.preventDefault()
        onTranslate()
      }}
      className={cn(
        "pointer-events-auto relative flex h-10 items-center border-border bg-white shadow-lg transition-transform duration-300 dark:bg-neutral-900",
        dragging
          ? "w-10 cursor-grabbing touch-none justify-center rounded-full border opacity-100"
          : side === "right"
            ? "w-11 justify-start rounded-l-full border border-r-0"
            : "w-11 justify-end rounded-r-full border border-l-0",
        !dragging &&
          (attached ? "translate-x-0" : side === "right" ? "translate-x-6" : "-translate-x-6"),
        !dragging && (expanded ? "opacity-100" : "opacity-60"),
        !dragging && "cursor-pointer",
      )}
      {...pointerHandlers}
      onMouseEnter={onMouseEnter}
    >
      <img
        src={readFrogLogoUrl}
        alt={APP_NAME}
        className={cn(
          "h-8 w-8 rounded-full",
          !translated && "grayscale",
          !dragging && (side === "right" ? "ml-1" : "mr-1"),
        )}
      />
    </div>
  )
}
