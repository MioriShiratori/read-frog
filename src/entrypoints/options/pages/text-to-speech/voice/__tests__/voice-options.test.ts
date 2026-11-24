import { describe, expect, it } from "vitest"
import { getTTSVoiceDisplayName, getTTSVoiceGroups } from "../voice-options"

describe("voice choices", () => {
  it("keeps regional English groups together without leaking other languages", () => {
    const groups = getTTSVoiceGroups("en")
    expect(groups.map((group) => group.language)).toEqual(
      expect.arrayContaining([
        "English (United States)",
        "English (United Kingdom)",
        "English (Australia)",
      ]),
    )
    expect(
      groups.flatMap((group) => group.items).every((item) => item.voice.startsWith("en-")),
    ).toBe(true)
    expect(groups.every((group) => group.items.length > 0)).toBe(true)
  })

  it("separates Mandarin scripts, Cantonese and Portuguese varieties", () => {
    const voices = (language: Parameters<typeof getTTSVoiceGroups>[0]) =>
      getTTSVoiceGroups(language).flatMap((group) => group.items.map((item) => item.voice))
    const simplified = voices("zh-Hans")
    const traditional = voices("zh-Hant")
    const cantonese = voices("yue")
    expect(simplified).toContain("zh-CN-XiaoxiaoNeural")
    expect(traditional).toContain("zh-TW-HsiaoChenNeural")
    expect(cantonese).toEqual(
      expect.arrayContaining(["zh-HK-HiuGaaiNeural", "yue-CN-XiaoMinNeural"]),
    )
    expect(
      simplified.some((voice) => traditional.includes(voice) || cantonese.includes(voice)),
    ).toBe(false)
    expect(traditional.some((voice) => cantonese.includes(voice))).toBe(false)
    expect(voices("pt-BR").every((voice) => voice.startsWith("pt-BR-"))).toBe(true)
    expect(voices("pt-PT").every((voice) => voice.startsWith("pt-PT-"))).toBe(true)
  })

  it("matches script-bearing locales and leaves unavailable languages empty", () => {
    expect(
      getTTSVoiceGroups("ff").flatMap((group) => group.items.map((item) => item.voice)),
    ).toContain("ff-Latn-SN-SambaNeural")
    expect(getTTSVoiceGroups("br")).toEqual([])
  })

  it("retains all languages for the global fallback picker", () => {
    const groups = getTTSVoiceGroups()
    expect(groups.map((group) => group.language)).toEqual(
      expect.arrayContaining([
        "English (United States)",
        "Japanese (Japan)",
        "Chinese (Mandarin, Simplified)",
      ]),
    )
  })
})

describe("voice display names", () => {
  it.each([
    ["en-US-JaneNeural", "JaneNeural"],
    ["en-US-Harper:MAI-Voice-2", "Harper:MAI-Voice-2"],
    ["ff-Latn-SN-SambaNeural", "SambaNeural"],
    ["zh-CN-liaoning-XiaobeiNeural", "XiaobeiNeural"],
    ["fr-Multitalker:DragonHDLatestNeural", "Multitalker:DragonHDLatestNeural"],
    ["CustomVoice", "CustomVoice"],
  ])("shortens %s without damaging its name", (voice, expected) => {
    expect(getTTSVoiceDisplayName(voice)).toBe(expected)
  })
})
