import { browser } from "#imports"
import { env } from "@/env"
import { createLogger } from "@/utils/logging/logger"
import { onMessage, sendMessage } from "@/utils/message"

const log = createLogger("background/new-user-guide")

let lastIsPinned = false

export function newUserGuide() {
  void guidePinExtension()
}

export async function guidePinExtension() {
  onMessage("getPinState", async () => {
    const { isOnToolbar } = await browser.action.getUserSettings()
    return isOnToolbar
  })

  void checkPinnedAndNotify()

  if (browser.action.onUserSettingsChanged) {
    browser.action.onUserSettingsChanged.addListener(checkPinnedAndNotify)
  } else {
    setInterval(checkPinnedAndNotify, 1_000)
  }
}

async function checkPinnedAndNotify() {
  const { isOnToolbar } = await browser.action.getUserSettings()
  if (isOnToolbar === lastIsPinned) return
  lastIsPinned = isOnToolbar

  browser.tabs.query(
    { url: env.WXT_OFFICIAL_SITE_ORIGINS.map((origin: string) => `${origin}/*`) },
    (tabs) => {
      for (const tab of tabs) {
        // Every service worker start sends this again, and a site tab with no
        // content script (after an update, or discarded) has no receiver: routine,
        // so kept out of the local log.
        void sendMessage("pinStateChanged", { isPinned: isOnToolbar }, tab.id).catch((error) => {
          log.debug("Failed to notify pin state", { error })
        })
      }
    },
  )
}
