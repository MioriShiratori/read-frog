import type { FloatingButtonSide } from "@/types/config/floating-button"
import { RiTranslate } from "@remixicon/react"
import { browser } from "#imports"
import { TRANSLATION_HUB_PAGE_PATH } from "@/utils/constants/translation-hub"
import { i18n } from "@/utils/i18n"
import { sendMessage } from "@/utils/message"
import HiddenButton from "./components/hidden-button"

export default function TranslationHubButton({
  side,
  expanded,
}: {
  side: FloatingButtonSide
  expanded: boolean
}) {
  return (
    <HiddenButton
      side={side}
      expanded={expanded}
      icon={<RiTranslate className="h-5 w-5" />}
      label={i18n.t("options.tools.translationHub")}
      onClick={() =>
        void sendMessage("openPage", {
          url: browser.runtime.getURL(TRANSLATION_HUB_PAGE_PATH),
          active: true,
        })
      }
    />
  )
}
