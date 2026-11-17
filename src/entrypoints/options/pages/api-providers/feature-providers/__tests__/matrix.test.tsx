// @vitest-environment jsdom
import type { Config } from "@/types/config/config"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createStore, Provider } from "jotai"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fakeBrowser } from "wxt/testing/fake-browser"
import { toastManager } from "@/components/ui/base-ui/toast"
import { configSchema } from "@/types/config/config"
import { configAtom } from "@/utils/atoms/config"
import { DEFAULT_CONFIG } from "@/utils/constants/config"
import { DEFAULT_PROVIDER_CONFIG } from "@/utils/constants/providers"
import { getBuiltInDictionaryAction, getSelectionToolbarActions } from "@/utils/custom-actions"
import { FeatureProvidersConfig } from ".."

vi.mock("@/components/providers/theme-provider", () => ({ useTheme: () => ({ theme: "light" }) }))
vi.mock("@/components/provider-icon", () => ({ default: () => null }))
vi.mock("@/components/llm-providers/set-api-key-warning", () => ({ SetApiKeyWarning: () => null }))
vi.mock("@/components/ui/base-ui/toast", () => ({
  toastManager: { add: vi.fn<typeof toastManager.add>() },
}))
vi.mock("@/utils/i18n", () => ({
  i18n: {
    t: (key: string, substitutions?: string[]) =>
      substitutions ? `${key}: ${substitutions[0]}` : key,
  },
}))

afterEach(cleanup)
beforeEach(() => {
  fakeBrowser.reset()
  vi.clearAllMocks()
})

async function setup(patch: Partial<Config> = {}) {
  const config: Config = {
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
  it("assigns every visible function without losing action settings", async () => {
    const selectionToolbar = structuredClone(DEFAULT_CONFIG.selectionToolbar)
    const template = getBuiltInDictionaryAction(selectionToolbar)
    selectionToolbar.customActions = [
      { ...template, id: "enabled-action", name: "Enabled action", enabled: true },
      { ...template, id: "disabled-action", name: "Disabled action", enabled: false },
    ]
    const { config } = await setup({ selectionToolbar })
    const targetId = DEFAULT_PROVIDER_CONFIG.lmstudio.id
    fireEvent.click(
      screen.getByRole("button", {
        name: "options.apiProviders.featureProviders.assignAll: LM Studio",
      }),
    )
    await waitFor(async () => {
      const { config: stored } = await fakeBrowser.storage.local.get("config")
      const saved = configSchema.parse(stored)
      expect(saved.pageTranslation.providerId).toBe(targetId)
      expect(saved.videoSubtitles.providerId).toBe(targetId)
      expect(saved.inputTranslation.providerId).toBe(targetId)
      expect(saved.selectionToolbar.features.translate.providerId).toBe(targetId)
      for (const action of getSelectionToolbarActions(config.selectionToolbar)) {
        const expected = action.enabled === false ? action.providerId : targetId
        expect(
          getSelectionToolbarActions(saved.selectionToolbar).find((item) => item.id === action.id),
        ).toEqual({ ...action, providerId: expected })
      }
      expect(saved.selectionToolbar.features).toEqual({
        ...config.selectionToolbar.features,
        translate: { ...config.selectionToolbar.features.translate, providerId: targetId },
      })
    })
  })
  it("keeps unsupported actions and translation-only page assignments when using a column header", async () => {
    const { config } = await setup({
      pageTranslation: { ...DEFAULT_CONFIG.pageTranslation, mode: "translationOnly" },
      videoSubtitles: {
        ...DEFAULT_CONFIG.videoSubtitles,
        providerId: DEFAULT_PROVIDER_CONFIG.openai.id,
      },
    })
    const microsoft = DEFAULT_PROVIDER_CONFIG["microsoft-translate"]
    fireEvent.click(
      screen.getByRole("button", {
        name: `options.apiProviders.featureProviders.assignAll: ${microsoft.name}`,
      }),
    )
    await waitFor(async () => {
      const { config: stored } = await fakeBrowser.storage.local.get("config")
      const saved = configSchema.parse(stored)
      expect(saved.pageTranslation).toEqual(config.pageTranslation)
      expect(saved.selectionToolbar.builtInActions).toEqual(config.selectionToolbar.builtInActions)
      expect(saved.selectionToolbar.customActions).toEqual(config.selectionToolbar.customActions)
      expect(saved.videoSubtitles.providerId).toBe(microsoft.id)
      expect(saved.inputTranslation.providerId).toBe(microsoft.id)
      expect(saved.selectionToolbar.features.translate.providerId).toBe(microsoft.id)
    })
  })
  it("preserves a subsequent individual choice after a bulk assignment", async () => {
    await setup()
    fireEvent.click(
      screen.getByRole("button", {
        name: "options.apiProviders.featureProviders.assignAll: LM Studio",
      }),
    )
    fireEvent.click(screen.getByRole("button", { name: `${pageName}: DeepSeek` }))
    await waitFor(async () => {
      const { config: stored } = await fakeBrowser.storage.local.get("config")
      const saved = configSchema.parse(stored)
      expect(saved.pageTranslation.providerId).toBe(DEFAULT_PROVIDER_CONFIG.deepseek.id)
      expect(saved.videoSubtitles.providerId).toBe(DEFAULT_PROVIDER_CONFIG.lmstudio.id)
      expect(saved.selectionToolbar.builtInActions.dictionary.providerId).toBe(
        DEFAULT_PROVIDER_CONFIG.lmstudio.id,
      )
    })
  })
  it.each(["removed", "disabled"])(
    "rechecks a provider %s in storage before committing bulk assignments",
    async (state) => {
      const { store, config } = await setup()
      const latest = {
        ...config,
        providersConfig: config.providersConfig.flatMap((provider): Config["providersConfig"] => {
          if (provider.provider !== "lmstudio") return [provider]
          return state === "removed" ? [] : [{ ...provider, enabled: false }]
        }),
      }
      await fakeBrowser.storage.local.set({ config: latest })
      fireEvent.click(
        screen.getByRole("button", {
          name: "options.apiProviders.featureProviders.assignAll: LM Studio",
        }),
      )
      await waitFor(() => expect(store.get(configAtom)).toEqual(latest))
      expect((await fakeBrowser.storage.local.get("config")).config).toEqual(latest)
      expect(toastManager.add).not.toHaveBeenCalled()
    },
  )
  it("reports a failed bulk save and restores the stored assignments", async () => {
    const { store, config } = await setup()
    vi.spyOn(fakeBrowser.storage.local, "set").mockRejectedValueOnce(
      new Error("Storage unavailable"),
    )
    fireEvent.click(
      screen.getByRole("button", {
        name: "options.apiProviders.featureProviders.assignAll: LM Studio",
      }),
    )
    await waitFor(() =>
      expect(toastManager.add).toHaveBeenCalledWith({
        type: "error",
        title: "options.apiProviders.featureProviders.saveError",
        description: "Storage unavailable",
      }),
    )
    expect(store.get(configAtom)).toEqual(config)
    expect((await fakeBrowser.storage.local.get("config")).config).toEqual(config)
    vi.restoreAllMocks()
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
