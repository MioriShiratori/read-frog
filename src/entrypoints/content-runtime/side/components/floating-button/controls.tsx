import type { FloatingButtonSide } from "@/types/config/floating-button"
import { IconLock, IconLockOpen, IconX } from "@tabler/icons-react"
import { useAtom, useSetAtom } from "jotai"
import { useState } from "react"
import { addSitePattern, HideMenuItems } from "@/components/hide-menu-items"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/base-ui/dropdown-menu"
import { configFieldsAtomMap } from "@/utils/atoms/config"
import { i18n } from "@/utils/i18n"
import { cn } from "@/utils/styles/utils"
import { isFloatingButtonHiddenUntilReloadAtom } from "../../atoms"
import { shadowWrapper } from "../../main"

const floatingButtonControlClassName = cn(
  "pointer-events-none invisible absolute flex size-6 cursor-pointer items-center justify-center",
  "text-neutral-300 transition-[color,left,right,transform] duration-300 hover:scale-110 hover:text-neutral-500 active:scale-90 active:text-neutral-500",
  "dark:text-neutral-700 dark:hover:text-neutral-500 dark:active:text-neutral-500",
)
const floatingButtonControlOffsetClassNames = {
  right: {
    collapsed: "left-0",
    expanded: "-left-6",
  },
  left: {
    collapsed: "right-0",
    expanded: "-right-6",
  },
} satisfies Record<FloatingButtonSide, { collapsed: string; expanded: string }>

interface FloatingButtonCloseMenuProps {
  expanded: boolean
  side: FloatingButtonSide
  onDropdownOpenChange: (open: boolean) => void
}

export function FloatingButtonCloseMenu({
  expanded,
  side,
  onDropdownOpenChange,
}: FloatingButtonCloseMenuProps) {
  const [floatingButton, setFloatingButton] = useAtom(configFieldsAtomMap.floatingButton)
  const setHiddenUntilReload = useSetAtom(isFloatingButtonHiddenUntilReloadAtom)
  const [open, setOpen] = useState(false)
  const controlOffsetClassName =
    !floatingButton.locked && !expanded
      ? floatingButtonControlOffsetClassNames[side].collapsed
      : floatingButtonControlOffsetClassNames[side].expanded

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    onDropdownOpenChange(nextOpen)
  }

  const handleHideOnSite = (hostname: string) => {
    void setFloatingButton({
      ...floatingButton,
      disabledFloatingButtonPatterns: addSitePattern(
        floatingButton.disabledFloatingButtonPatterns ?? [],
        hostname,
      ),
    })
  }

  const handleHideOnAllSites = () => {
    void setFloatingButton({ ...floatingButton, enabled: false })
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label={i18n.t("options.floatingButton.tooltips.floatingButtonOptions")}
            className={cn(
              floatingButtonControlClassName,
              "-top-1",
              controlOffsetClassName,
              expanded && "pointer-events-auto visible",
              open && "pointer-events-auto visible",
            )}
          />
        }
      >
        <IconX className="h-3 w-3" strokeWidth={3} />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        container={shadowWrapper}
        align="start"
        side={side === "right" ? "left" : "right"}
        className="z-2147483647 w-fit! max-w-72 min-w-48 whitespace-nowrap"
      >
        <HideMenuItems
          title={i18n.t("options.floatingButton.closeMenu.title")}
          settingsLocation={`${i18n.t("popup.options")} → ${i18n.t("options.floatingButton.title")}`}
          onHideUntilReload={() => setHiddenUntilReload(true)}
          onHideOnSite={handleHideOnSite}
          onHideOnAllSites={handleHideOnAllSites}
          onItemMouseDown={(e) => e.stopPropagation()}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface FloatingButtonLockControlProps {
  expanded: boolean
  side: FloatingButtonSide
}

export function FloatingButtonLockControl({ expanded, side }: FloatingButtonLockControlProps) {
  const [floatingButton, setFloatingButton] = useAtom(configFieldsAtomMap.floatingButton)
  const locked = floatingButton.locked
  const controlOffsetClassName =
    !locked && !expanded
      ? floatingButtonControlOffsetClassNames[side].collapsed
      : floatingButtonControlOffsetClassNames[side].expanded

  const handleToggleLocked = () => {
    void setFloatingButton({ ...floatingButton, locked: !locked })
  }
  const label = locked
    ? i18n.t("options.floatingButton.tooltips.unlockPosition")
    : i18n.t("options.floatingButton.tooltips.lockPosition")

  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        floatingButtonControlClassName,
        "-bottom-1",
        controlOffsetClassName,
        expanded && "pointer-events-auto visible",
      )}
      onClick={handleToggleLocked}
    >
      {locked ? (
        <IconLock className="h-3 w-3" strokeWidth={3} />
      ) : (
        <IconLockOpen className="h-3 w-3" strokeWidth={3} />
      )}
    </button>
  )
}
