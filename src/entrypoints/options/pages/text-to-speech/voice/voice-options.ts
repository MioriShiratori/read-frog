import type { LanguageTag } from "@read-frog/definitions"
import type { TTSVoice, TTSVoiceGroup } from "@/types/config/tts"
import { resolveLanguageForSpeech } from "@read-frog/definitions"
import { EDGE_TTS_VOICE_GROUPS } from "@/types/config/tts"

// A voice ID may include a script (ff-Latn-SN), and its name may contain hyphens
// (Harper:MAI-Voice-2). Strip only the locale, preserving the complete voice name.
const VOICE_LOCALE_PREFIX =
  /^[a-z]{2,3}(?:-[A-Z][a-z]{3})?(?:-(?:[A-Z]{2}|\d{3}))?(?:-[a-z]{5,8})*-/

export function getTTSVoiceDisplayName(voice: TTSVoice): string {
  return voice.replace(VOICE_LOCALE_PREFIX, "")
}

export function getTTSVoiceGroups(language?: LanguageTag): TTSVoiceGroup[] {
  if (!language) return EDGE_TTS_VOICE_GROUPS

  return EDGE_TTS_VOICE_GROUPS.flatMap((group) => {
    const items = group.items.filter((item) => {
      const locale = item.voice.match(VOICE_LOCALE_PREFIX)?.[0].slice(0, -1)
      return resolveLanguageForSpeech(locale) === language
    })
    return items.length ? [{ ...group, items }] : []
  })
}
