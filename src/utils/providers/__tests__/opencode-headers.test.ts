import { describe, expect, it } from "vitest"
import { getOpenCodeHeaders } from "../opencode-headers"

describe("OpenCode routing sessions", () => {
  it("keeps one routing session for related calls and isolates unrelated operations", () => {
    const first = new AbortController()
    const second = new AbortController()
    expect(getOpenCodeHeaders(first.signal)["x-opencode-session"]).toBe(
      getOpenCodeHeaders(first.signal)["x-opencode-session"],
    )
    expect(getOpenCodeHeaders(first.signal)["x-opencode-session"]).not.toBe(
      getOpenCodeHeaders(second.signal)["x-opencode-session"],
    )
    expect(getOpenCodeHeaders()["x-opencode-session"]).toBe(
      getOpenCodeHeaders()["x-opencode-session"],
    )
  })
  it("identifies this extension and protects mandatory headers case-insensitively", () => {
    const headers = getOpenCodeHeaders(undefined, {
      "user-agent": "wrong",
      "X-OpenCode-Session": "wrong",
      "X-Custom": "keep",
    })
    expect(headers["user-agent"]).toMatch(/^ReadFrog\//)
    expect(headers["x-opencode-session"]).toMatch(/^read-frog-/)
    expect(headers["x-custom"]).toBe("keep")
  })
})
