import { describe, expect, it } from "vitest"
import { DEFAULT_CONFIG } from "@/utils/constants/config"
import { floatingButtonSchema, floatingButtonSideSchema } from "../floating-button"

describe("floating button config validation", () => {
  it.each(["left", "right"])("allows the %s side", (side) => {
    expect(floatingButtonSideSchema.safeParse(side).success).toBe(true)
  })

  it("rejects unknown sides", () => {
    expect(floatingButtonSideSchema.safeParse("center").success).toBe(false)
  })

  it("discards the obsolete click action while loading legacy settings", () => {
    expect(
      floatingButtonSchema.parse({ ...DEFAULT_CONFIG.floatingButton, clickAction: "panel" }),
    ).toEqual(DEFAULT_CONFIG.floatingButton)
  })

  it("accepts the default floating button config", () => {
    expect(floatingButtonSchema.safeParse(DEFAULT_CONFIG.floatingButton).success).toBe(true)
  })
})
