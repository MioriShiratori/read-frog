import type { Config as SeedConfig } from "@/types/config/config"
// @vitest-environment jsdom
import { render } from "@testing-library/react"
import { createStore, Provider } from "jotai"
import { describe, expect, it } from "vitest"
import { fakeBrowser } from "wxt/testing/fake-browser"
import { configAtom } from "@/utils/atoms/config"
import { DEFAULT_CONFIG } from "@/utils/constants/config"
import { getBuiltInDictionaryAction } from "@/utils/custom-actions"
import { useProviderEditor } from "../api-providers/providers-config/provider-editor"
import {
  ActionEditor,
  BuiltInActionEditor,
  useActionEditor,
} from "../custom-actions/action-config-form/action-editor"

function seedConfig(store: ReturnType<typeof createStore>, config: SeedConfig) {
  void fakeBrowser.storage.local.set({ config })
  store.set(configAtom, config)
}

function ActionContextProbe() {
  useActionEditor()
  return null
}

function ProviderContextProbe() {
  useProviderEditor()
  return null
}

function createConfigStore() {
  const store = createStore()
  seedConfig(store, structuredClone(DEFAULT_CONFIG))
  return store
}

describe("editor compound component contexts", () => {
  it("fails fast when an ActionEditor component is outside its provider", () => {
    expect(() => render(<ActionContextProbe />)).toThrow(
      "ActionEditor components must be rendered inside an ActionEditor Provider",
    )
  })

  it("fails fast when a ProviderEditor component is outside its provider", () => {
    expect(() => render(<ProviderContextProbe />)).toThrow(
      "ProviderEditor components must be rendered inside a ProviderEditor Provider",
    )
  })

  it("fails fast when Delete is composed for a built-in action", () => {
    const store = createConfigStore()
    const action = getBuiltInDictionaryAction(store.get(configAtom).selectionToolbar)

    expect(() =>
      render(
        <Provider store={store}>
          <BuiltInActionEditor.Provider action={action}>
            <ActionEditor.DeleteButton />
          </BuiltInActionEditor.Provider>
        </Provider>,
      ),
    ).toThrow("ActionEditor.delete is unavailable in this composition")
  })
})
