// @vitest-environment jsdom

import type { LanguageTag } from "@read-frog/definitions"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createStore, Provider } from "jotai"
import { describe, expect, it, vi } from "vitest"
import { configFieldsAtomMap } from "@/utils/atoms/config"
import { VoiceSection } from ".."
import { LanguageVoiceItem } from "../language-voice-item"
import { TTSVoiceCombobox } from "../voice-combobox"

vi.mock("@/utils/atoms/config", async () => {
  const { atom } = await import("jotai")
  const { DEFAULT_CONFIG } = await import("@/utils/constants/config")
  const state = atom(DEFAULT_CONFIG.tts)
  return {
    configFieldsAtomMap: {
      tts: atom(
        (get) => get(state),
        (get, set, update: Partial<typeof DEFAULT_CONFIG.tts>) => {
          set(state, { ...get(state), ...update })
        },
      ),
    },
  }
})

vi.mock("@/hooks/use-text-to-speech", () => ({
  useTextToSpeech: () => ({ play: vi.fn<() => void>(), isFetching: false, isPlaying: false }),
}))

vi.mock("@/components/language-combobox", () => ({
  LanguageCombobox: ({
    value,
    onValueChange,
  }: {
    value: LanguageTag
    onValueChange: (language: LanguageTag) => void
  }) => (
    <select
      aria-label="Voice language"
      value={value}
      onChange={(event) => onValueChange(event.target.value === "ja" ? "ja" : "en")}
    >
      <option value="en">English</option>
      <option value="ja">Japanese</option>
    </select>
  ),
}))

describe("language voice selection", () => {
  it("limits the menu to the chosen language and saves full voice IDs per language", async () => {
    const store = createStore()
    const initial = store.get(configFieldsAtomMap.tts)
    render(
      <Provider store={store}>
        <LanguageVoiceItem />
      </Provider>,
    )

    fireEvent.click(screen.getByRole("combobox", { name: "options.tts.voice.language.title" }))
    const list = await screen.findByRole("grid")
    expect(within(list).getByText("English (United States)")).toBeInTheDocument()
    expect(within(list).queryByText("Japanese (Japan)")).not.toBeInTheDocument()
    expect(within(list).queryByText("Chinese (Mandarin, Simplified)")).not.toBeInTheDocument()

    fireEvent.click(within(list).getByText("JaneNeural"))
    expect(store.get(configFieldsAtomMap.tts).languageVoices.en).toBe("en-US-JaneNeural")
    fireEvent.change(screen.getByLabelText("Voice language"), { target: { value: "ja" } })
    fireEvent.click(screen.getByRole("combobox", { name: "options.tts.voice.language.title" }))
    await waitFor(() => {
      expect(screen.getByText("Japanese (Japan)")).toBeInTheDocument()
      expect(screen.queryByText("English (United States)")).not.toBeInTheDocument()
    })
    fireEvent.click(screen.getByText("NanamiNeural"))
    const updated = store.get(configFieldsAtomMap.tts)
    expect(updated.languageVoices.ja).toBe("ja-JP-NanamiNeural")
    expect(updated.languageVoices.en).toBe("en-US-JaneNeural")
    expect(updated.defaultVoice).toBe(initial.defaultVoice)
    expect(updated.languageVoices["zh-Hans"]).toBe(initial.languageVoices["zh-Hans"])
  })

  it("keeps the fallback multilingual and searchable by full ID while displaying short names", async () => {
    const store = createStore()
    const originalVoices = store.get(configFieldsAtomMap.tts).languageVoices
    render(
      <Provider store={store}>
        <VoiceSection />
      </Provider>,
    )

    const trigger = screen.getByRole("combobox", { name: "options.tts.voice.fallback.title" })
    expect(trigger).toHaveTextContent("AndrewMultilingualNeural")
    expect(trigger).not.toHaveTextContent("en-US-")
    fireEvent.click(trigger)
    const grid = await screen.findByRole("grid")
    expect(within(grid).getByText("Japanese (Japan)")).toBeInTheDocument()
    expect(within(grid).getByText("English (United States)")).toBeInTheDocument()

    const search = screen.getByPlaceholderText("options.tts.voice.selectPlaceholder")
    fireEvent.change(search, { target: { value: "JA-jp-NANAMI" } })
    await waitFor(() => {
      expect(within(grid).getByText("NanamiNeural")).toBeInTheDocument()
      expect(within(grid).queryByText("JaneNeural")).not.toBeInTheDocument()
    })
    fireEvent.click(within(grid).getByText("NanamiNeural"))
    expect(store.get(configFieldsAtomMap.tts).defaultVoice).toBe("ja-JP-NanamiNeural")
    expect(store.get(configFieldsAtomMap.tts).languageVoices).toEqual(originalVoices)
  })

  it("shows an empty result for unavailable languages without changing a saved custom voice", async () => {
    const onChange = vi.fn<(voice: string) => void>()
    const { rerender } = render(
      <TTSVoiceCombobox language="br" value="CustomVoice" onValueChange={onChange} />,
    )
    expect(screen.getByRole("combobox")).toHaveTextContent("CustomVoice")
    fireEvent.click(screen.getByRole("combobox"))
    expect(await screen.findByText("options.tts.voice.noVoicesFound")).toBeVisible()
    expect(onChange).not.toHaveBeenCalled()
    rerender(<TTSVoiceCombobox language="en" value="CustomVoice" onValueChange={onChange} />)
    expect(await screen.findByText("JaneNeural")).toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })
})
