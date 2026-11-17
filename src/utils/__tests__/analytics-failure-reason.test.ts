import { describe, expect, it } from "vitest"
import { classifyFailureReason } from "../analytics-failure-reason"

function namedError(name: string, extra: Record<string, unknown> = {}) {
  return Object.assign(new Error(name), { name, ...extra })
}

/** A background error as the messaging layer rebuilds it: a plain Error that keeps its name. */

describe("classifyFailureReason", () => {
  it("follows the cause chain the background wraps errors in", () => {
    const wrapped = new Error("stream failed", {
      cause: new Error("outer", { cause: namedError("AI_LoadAPIKeyError") }),
    })

    expect(classifyFailureReason(wrapped)).toBe("missing_api_key")
  })

  it("trusts a reason the background already attached", () => {
    expect(classifyFailureReason(Object.assign(new Error("x"), { reason: "quota_exceeded" }))).toBe(
      "quota_exceeded",
    )
  })

  it.each([
    ["an unrelated error", new Error("boom")],
    ["an unknown code", Object.assign(new Error("x"), { code: "constructor" })],
    ["a made-up reason", Object.assign(new Error("x"), { reason: "gremlins" })],
    [
      "a malformed base URL",
      new TypeError(
        "Failed to execute 'fetch' on 'WorkerGlobalScope': Failed to parse URL from localhost:11434/v1",
      ),
    ],
    [
      "a code bug that mentions fetch",
      new TypeError("Cannot read properties of undefined (reading 'prefetchQuery')"),
    ],
    ["a non-error value", "boom"],
    ["nothing at all", undefined],
  ])("falls back to unknown for %s", (_scenario, error) => {
    expect(classifyFailureReason(error)).toBe("unknown")
  })
})
