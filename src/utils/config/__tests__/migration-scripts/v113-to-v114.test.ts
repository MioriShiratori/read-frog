import { describe, expect, it } from "vitest"
import { migrate } from "../../migration-scripts/v113-to-v114"

const connection = {
  notebaseId: "notebase-1",
  notebaseNameSnapshot: "Words",
  connectedAccount: { id: "user-1", name: "Reader", email: "reader@example.com" },
  mappings: [
    {
      id: "mapping-1",
      localFieldId: "default-dictionary-term",
      notebaseColumnId: "column-term",
      notebaseColumnNameSnapshot: "Term",
    },
  ],
}

describe("v113-to-v114 migration", () => {
  it("changes nothing: v114 only allows a new optional list", () => {
    const config = {
      selectionToolbar: { builtInActions: { dictionary: { notebaseConnection: connection } } },
    }
    expect(migrate(config)).toBe(config)
  })
})
