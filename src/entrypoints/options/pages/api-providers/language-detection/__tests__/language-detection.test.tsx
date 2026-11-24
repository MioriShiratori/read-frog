// @vitest-environment jsdom

import { render, screen } from "@testing-library/react"
import { Provider, createStore } from "jotai"
import { describe, expect, it, vi } from "vitest"
import { configFieldsAtomMap } from "@/utils/atoms/config"
import { DEFAULT_PROVIDER_CONFIG } from "@/utils/constants/providers"
import { LanguageDetectionConfig } from ".."

vi.mock("@/utils/atoms/config", async () => {
  const { atom } = await vi.importActual<typeof import("jotai")>("jotai")
  return {
    configFieldsAtomMap: {
      languageDetection: atom({ mode: "basic" as const, providerId: undefined }),
      providersConfig: atom([]),
    },
  }
})

vi.mock("@/components/llm-providers/provider-selector", () => ({
  default: ({ value }: { value: string }) => <div data-testid="provider-selector">{value}</div>,
}))

const localProvider = structuredClone(DEFAULT_PROVIDER_CONFIG.openai)

function renderLanguageDetection(mode: "basic" | "llm") {
  const store = createStore()
  void store.set(configFieldsAtomMap.providersConfig, [localProvider])
  void store.set(
    configFieldsAtomMap.languageDetection,
    mode === "llm" ? { mode, providerId: localProvider.id } : { mode },
  )

  return render(
    <Provider store={store}>
      <LanguageDetectionConfig />
    </Provider>,
  )
}

describe("LanguageDetectionConfig", () => {
  it("enables LLM mode when a local LLM is the only usable provider", () => {
    renderLanguageDetection("basic")

    expect(
      screen.getByRole("radio", {
        name: "options.apiProviders.languageDetection.mode.llm",
      }),
    ).toBeEnabled()
  })

  it("keeps the selected local provider visible in LLM mode", () => {
    renderLanguageDetection("llm")

    expect(screen.getByTestId("provider-selector")).toHaveTextContent(localProvider.id)
  })
})
