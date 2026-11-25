import { describe, expect, it, vi } from "vitest"
import { getOpenCodeHeaders } from "../opencode-headers"

describe("OpenCode routing sessions", () => {
  it("keeps one routing session for related calls and isolates unrelated operations", () => {
    const first = new AbortController()
    const second = new AbortController()
    expect(getOpenCodeHeaders({ signal: first.signal })["x-opencode-session"]).toBe(
      getOpenCodeHeaders({ signal: first.signal })["x-opencode-session"],
    )
    expect(getOpenCodeHeaders({ signal: first.signal })["x-opencode-session"]).not.toBe(
      getOpenCodeHeaders({ signal: second.signal })["x-opencode-session"],
    )
    expect(getOpenCodeHeaders()["x-opencode-session"]).toBe(
      getOpenCodeHeaders()["x-opencode-session"],
    )
  })
  it("keeps a page session stable across batches and retries with independent signals", () => {
    const first = getOpenCodeHeaders({
      sessionId: "page-session",
      signal: new AbortController().signal,
    })
    const next = getOpenCodeHeaders({
      sessionId: "page-session",
      signal: new AbortController().signal,
    })
    expect(first["x-opencode-session"]).toBe(next["x-opencode-session"])
    expect(first["x-opencode-session"]).not.toBe(
      getOpenCodeHeaders({ sessionId: "other-page" })["x-opencode-session"],
    )
  })
  it("retains a page's routing identity after an event background restarts", async () => {
    const previous = getOpenCodeHeaders({ sessionId: "tab:random-page-session" })
    vi.resetModules()
    const restarted = await import("../opencode-headers")
    expect(
      restarted.getOpenCodeHeaders({ sessionId: "tab:random-page-session" })["x-opencode-session"],
    ).toBe(previous["x-opencode-session"])
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
