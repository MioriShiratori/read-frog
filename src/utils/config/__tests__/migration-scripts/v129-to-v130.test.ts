import { describe, expect, it } from "vitest"
import { migrate } from "../../migration-scripts/v129-to-v130"

describe("v129-to-v130 migration", () => {
  it("disables original hover for existing configs without mutating other preferences", () => {
    const oldConfig = {
      pageTranslation: {
        providerId: "provider-1",
        page: {
          range: "main",
          skipLanguages: ["jpn"],
        },
      },
    }
    const snapshot = structuredClone(oldConfig)

    const migrated = migrate(oldConfig)

    expect(migrated).toEqual({
      pageTranslation: {
        providerId: "provider-1",
        page: {
          range: "main",
          skipLanguages: ["jpn"],
          showOriginalOnHover: false,
        },
      },
    })
    expect(oldConfig).toEqual(snapshot)
    expect(migrate(migrated)).toBe(migrated)
  })

  it("preserves an enabled preference when rerun", () => {
    const oldConfig = {
      pageTranslation: {
        page: {
          range: "all",
          showOriginalOnHover: true,
        },
      },
    }

    expect(migrate(oldConfig)).toBe(oldConfig)
  })

  it("leaves malformed config shapes unchanged", () => {
    expect(migrate(null)).toBeNull()
    expect(migrate([])).toEqual([])
    expect(migrate({})).toEqual({})
    expect(migrate({ pageTranslation: null })).toEqual({ pageTranslation: null })
    expect(migrate({ pageTranslation: { page: [] } })).toEqual({ pageTranslation: { page: [] } })
  })
})
