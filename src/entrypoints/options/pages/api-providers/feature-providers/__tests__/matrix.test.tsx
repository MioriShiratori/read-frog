// @vitest-environment jsdom
import type { Config } from "@/types/config/config"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createStore, Provider } from "jotai"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fakeBrowser } from "wxt/testing/fake-browser"
import { configSchema } from "@/types/config/config"
import { configAtom } from "@/utils/atoms/config"
import { DEFAULT_CONFIG } from "@/utils/constants/config"
import { DEFAULT_PROVIDER_CONFIG } from "@/utils/constants/providers"
import { getBuiltInDictionaryAction } from "@/utils/custom-actions"
import { FeatureProvidersConfig } from ".."

vi.mock("@/components/providers/theme-provider", () => ({ useTheme: () => ({ theme: "light" }) }))
vi.mock("@/components/provider-icon", () => ({ default: () => null }))
vi.mock("@/components/llm-providers/set-api-key-warning", () => ({ SetApiKeyWarning: () => null }))
vi.mock("@/utils/i18n", () => ({ i18n: { t: (key: string) => key } }))

afterEach(cleanup)
beforeEach(() => fakeBrowser.reset())

async function setup(patch: Partial<Config> = {}) {
  const config = {
    ...structuredClone(DEFAULT_CONFIG),
    ...patch,
    providersConfig: [
      DEFAULT_PROVIDER_CONFIG["google-translate"],
      DEFAULT_PROVIDER_CONFIG["microsoft-translate"],
      DEFAULT_PROVIDER_CONFIG.openai,
      DEFAULT_PROVIDER_CONFIG.deepseek,
      DEFAULT_PROVIDER_CONFIG.lmstudio,
      { ...DEFAULT_PROVIDER_CONFIG.opencode, enabled: false },
    ],
  }
  await fakeBrowser.storage.local.set({ config })
  const store = createStore()
  store.set(configAtom, config)
  render(
    <Provider store={store}>
      <FeatureProvidersConfig />
    </Provider>,
  )
  return { store, config }
}
const pageName = "options.apiProviders.featureProviders.features.pageTranslation"

describe("feature provider matrix", () => {
  it("assigns exactly one provider per function and persists independent row changes", async () => {
    const { store, config } = await setup()
    const dictionary = getBuiltInDictionaryAction(config.selectionToolbar)
    fireEvent.click(screen.getByRole("button", { name: `${pageName}: DeepSeek` }))
    fireEvent.click(screen.getByRole("button", { name: `${dictionary.name}: LM Studio` }))
    await waitFor(async () => {
      const { config: stored } = await fakeBrowser.storage.local.get("config")
      const saved = configSchema.parse(stored)
      expect(saved.pageTranslation.providerId).toBe(DEFAULT_PROVIDER_CONFIG.deepseek.id)
      expect(saved.selectionToolbar.builtInActions.dictionary.providerId).toBe(
        DEFAULT_PROVIDER_CONFIG.lmstudio.id,
      )
    })
    expect(store.get(configAtom).pageTranslation.providerId).toBe(
      DEFAULT_PROVIDER_CONFIG.deepseek.id,
    )
    expect(screen.getByRole("button", { name: `${pageName}: DeepSeek` })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    expect(screen.getByRole("button", { name: `${pageName}: OpenAI` })).toHaveAttribute(
      "aria-pressed",
      "false",
    )
  })
  it("only lists enabled providers and disallows translation-only services for custom actions", async () => {
    const { config } = await setup()
    expect(screen.queryByRole("columnheader", { name: "OpenCode" })).not.toBeInTheDocument()
    expect(
      screen.getByRole("button", {
        name: `${getBuiltInDictionaryAction(config.selectionToolbar).name}: ${DEFAULT_PROVIDER_CONFIG["microsoft-translate"].name}`,
      }),
    ).toBeDisabled()
    expect(
      screen.getByRole("button", {
        name: `${pageName}: ${DEFAULT_PROVIDER_CONFIG["microsoft-translate"].name}`,
      }),
    ).toBeEnabled()
  })
  it("preserves the markup restriction for translation-only page mode", async () => {
    await setup({ pageTranslation: { ...DEFAULT_CONFIG.pageTranslation, mode: "translationOnly" } })
    expect(
      screen.getByRole("button", {
        name: `${pageName}: ${DEFAULT_PROVIDER_CONFIG["microsoft-translate"].name}`,
      }),
    ).toBeDisabled()
    expect(
      screen.getByRole("button", {
        name: `options.apiProviders.featureProviders.features.selectionTranslation: ${DEFAULT_PROVIDER_CONFIG["microsoft-translate"].name}`,
      }),
    ).toBeEnabled()
  })
  it("scrolls provider columns when the wheel is over a cell or the fixed labels", async () => {
    await setup()
    const region = screen.getByRole("region")
    Object.defineProperties(region, { scrollWidth: { value: 1500 }, clientWidth: { value: 900 } })
    const cell = screen.getByRole("button", { name: `${pageName}: OpenAI` })
    const event = new WheelEvent("wheel", { deltaY: 120, bubbles: true, cancelable: true })
    fireEvent(cell, event)
    expect(event.defaultPrevented).toBe(true)
    expect(region.scrollLeft).toBe(120)
    fireEvent.wheel(screen.getByRole("rowheader", { name: new RegExp(pageName) }), {
      deltaY: -3,
      deltaMode: 1,
    })
    expect(region.scrollLeft).toBe(72)
    const zoom = new WheelEvent("wheel", {
      deltaY: 120,
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    })
    fireEvent(cell, zoom)
    expect(zoom.defaultPrevented).toBe(false)
    expect(region.scrollLeft).toBe(72)
  })
})
