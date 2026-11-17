import { generateText } from "ai"
import { afterEach, describe, expect, it, vi } from "vitest"
import { DEFAULT_PROVIDER_CONFIG } from "@/utils/constants/providers"
import { getLanguageModelForConfig } from "../model"
import { createOpenCodeFetch } from "../opencode-headers"

function captureRequests() {
  const requests: Request[] = []
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async (input, init) => {
      requests.push(new Request(input, init))
      return Response.json({
        id: "test-completion",
        object: "chat.completion",
        created: 1,
        model: "local-model",
        choices: [
          {
            index: 0,
            message: { role: "assistant", content: "Translated" },
            finish_reason: "stop",
          },
        ],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      })
    }),
  )
  return requests
}

afterEach(() => vi.unstubAllGlobals())

describe("preset HTTP transports", () => {
  it("sends OpenCode session and client headers on generation, including repeated calls in one scope", async () => {
    const requests = captureRequests()
    const signal = new AbortController().signal
    const config = {
      ...DEFAULT_PROVIDER_CONFIG.opencode,
      apiKey: "test-key",
      model: { model: "use-custom-model", isCustomModel: true, customModel: "test-model" },
    } as const
    for (let index = 0; index < 2; index++) {
      const result = await generateText({
        model: getLanguageModelForConfig(config, signal),
        prompt: "Translate",
        maxRetries: 0,
      })
      expect(result.text).toBe("Translated")
    }
    expect(requests.map((request) => request.url)).toEqual([
      "https://opencode.ai/inference/openai/v1/chat/completions",
      "https://opencode.ai/inference/openai/v1/chat/completions",
    ])
    expect(requests[0]!.headers.get("authorization")).toBe("Bearer test-key")
    expect(requests[0]!.headers.get("user-agent")).toMatch(/^ReadFrog\//)
    expect(requests[0]!.headers.get("x-opencode-session")).toBeTruthy()
    expect(requests[0]!.headers.get("x-opencode-session")).toBe(
      requests[1]!.headers.get("x-opencode-session"),
    )
  })
  it("retains headers for Request and URL inputs while always identifying the extension", async () => {
    const requests = captureRequests()
    const transport = createOpenCodeFetch()
    await transport(
      new Request("https://opencode.example/endpoint", {
        headers: { "X-Custom": "kept", "User-Agent": "overridden" },
      }),
    )
    await transport("https://opencode.example/endpoint")
    expect(requests[0]!.headers.get("x-custom")).toBe("kept")
    expect(requests[0]!.headers.get("user-agent")).toMatch(/^ReadFrog\//)
    expect(requests[1]!.headers.get("x-opencode-session")).toBe(
      requests[0]!.headers.get("x-opencode-session"),
    )
  })
  it("connects to an unauthenticated LM Studio server without a dummy bearer key", async () => {
    const requests = captureRequests()
    const config = {
      ...DEFAULT_PROVIDER_CONFIG.lmstudio,
      model: { model: "use-custom-model", isCustomModel: true, customModel: "local-model" },
    } as const
    await generateText({
      model: getLanguageModelForConfig(config),
      prompt: "Translate",
      maxRetries: 0,
    })
    expect(requests[0]!.url).toBe("http://127.0.0.1:1234/v1/chat/completions")
    expect(requests[0]!.headers.has("authorization")).toBe(false)
    expect(requests[0]!.headers.has("x-opencode-session")).toBe(false)
  })
})
