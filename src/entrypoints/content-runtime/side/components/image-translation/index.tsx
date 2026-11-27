import type { FloatingButtonSide } from "@/types/config/floating-button"
import { RiImageLine } from "@remixicon/react"
import { lazy, Suspense, useCallback, useState } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/base-ui/button"
import { i18n } from "@/utils/i18n"
import { shadowWrapper } from "../../main"
import HiddenButton from "../floating-button/components/hidden-button"

const Session = lazy(() =>
  import("./session").then((module) => ({ default: module.ImageTranslationSession })),
)

export function ImageTranslationButton({
  side,
  expanded,
  dragging,
}: {
  side: FloatingButtonSide
  expanded: boolean
  dragging: boolean
}) {
  const [mode, setMode] = useState<"menu" | "area" | "image" | null>(null)
  const close = useCallback(() => setMode(null), [])
  return (
    <>
      {!dragging && (
        <HiddenButton
          side={side}
          expanded={expanded}
          icon={<RiImageLine className="h-5 w-5" />}
          label={i18n.t("imageTranslation.title")}
          onClick={() => setMode((value) => (value ? null : "menu"))}
        />
      )}
      {shadowWrapper &&
        mode &&
        createPortal(
          mode === "menu" ? (
            <div className="pointer-events-auto fixed top-4 right-4 z-2147483647 flex flex-col gap-2 rounded-lg border border-border bg-background p-4 text-foreground shadow-lg">
              <strong className="text-sm">{i18n.t("imageTranslation.title")}</strong>
              <Button data-testid="image-translation-mode-area" onClick={() => setMode("area")}>
                {i18n.t("imageTranslation.area")}
              </Button>
              <Button data-testid="image-translation-mode-image" onClick={() => setMode("image")}>
                {i18n.t("imageTranslation.image")}
              </Button>
              <Button variant="ghost" onClick={close}>
                {i18n.t("imageTranslation.cancel")}
              </Button>
            </div>
          ) : (
            <Suspense
              fallback={
                <div role="status" className="fixed top-4 right-4 bg-background p-4">
                  {i18n.t("imageTranslation.loading")}
                </div>
              }
            >
              <Session key={mode} mode={mode} onClose={close} />
            </Suspense>
          ),
          shadowWrapper,
        )}
    </>
  )
}
