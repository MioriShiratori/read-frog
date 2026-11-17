// @vitest-environment jsdom
import { createStore } from "jotai"
import { describe, expect, it } from "vitest"
import { selectedProviderIdAtom } from "../atoms"

describe("selectedProviderIdAtom", () => {
  it("keeps the provider picked afterwards", async () => {
    const store = createStore()

    await store.set(selectedProviderIdAtom, "provider-1")

    expect(store.get(selectedProviderIdAtom)).toBe("provider-1")
  })
})
