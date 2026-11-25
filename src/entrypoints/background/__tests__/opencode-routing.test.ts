import { afterEach, expect, it, vi } from "vitest"
import { storage } from "#imports"
import { DEFAULT_CONFIG } from "@/utils/constants/config"
import { DEFAULT_PROVIDER_CONFIG } from "@/utils/constants/providers"
import { createWebPageTranslationQueues } from "../translation-queues"

vi.mock("../config", async () => {
  const { DEFAULT_CONFIG: baseConfig } = await import("@/utils/constants/config")
  return { ensureInitializedConfig: async () => structuredClone(baseConfig) }
})
vi.mock("@/utils/batch-request-record", () => ({ putBatchRequestRecord: async () => {} }))

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it("routes consecutive batches and a separate page through their own stable OpenCode sessions", async () => {
  const requests: { session: string | null; count: number; input: string }[] = []
  let mergeBatches = false
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async (input, init) => {
      const request = new Request(input, init)
      // The SDK serializes external request bodies; validate only the message
      // fields this wire-boundary test needs, without weakening production types.
      const body: { messages: { content: string }[] } = await request.json()
      const count = body.messages.at(-1)!.content.split(/\n\s*%%\s*\n/).length
      requests.push({
        session: request.headers.get("x-opencode-session"),
        count,
        input: body.messages.at(-1)!.content,
      })
      return Response.json({
        id: "local-test",
        object: "chat.completion",
        created: 1,
        model: "local-model",
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: Array.from({ length: mergeBatches ? 1 : count }, () => "译文").join(
                "\n%%\n",
              ),
            },
            finish_reason: "stop",
          },
        ],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      })
    }),
  )
  const config = structuredClone(DEFAULT_CONFIG)
  const provider = {
    ...DEFAULT_PROVIDER_CONFIG.opencode,
    apiKey: "local-test",
    model: { model: "use-custom-model" as const, isCustomModel: true, customModel: "local-model" },
  }
  config.providersConfig.push(provider)
  await storage.setItem("local:config", config)
  const { batchQueue } = await createWebPageTranslationQueues().queuesPromise
  const enqueue = (scope: string, hash: string) =>
    batchQueue.enqueue({
      provider: { kind: "local", config: provider },
      langConfig: config.language,
      text: `${hash}: An ordinary paragraph to translate.`,
      hash,
      scheduleAt: Date.now(),
      scope,
    })
  await enqueue("tab-one:session", "first")
  await Promise.all([enqueue("tab-one:session", "second"), enqueue("tab-two:session", "third")])
  expect(requests).toHaveLength(3)
  const [first, second, third] = ["first", "second", "third"].map((key) =>
    requests.find((request) => request.input.includes(`${key}:`))!,
  )
  expect(first!.session).toBeTruthy()
  expect(first!.session).toBe(second!.session)
  expect(first!.session).not.toBe(third!.session)
  expect(requests.map((request) => request.count)).toEqual([1, 1, 1])

  // Count-mismatch retries and their individual fallback create fresh abort
  // controllers. They must still belong to this page's original conversation.
  vi.useFakeTimers()
  mergeBatches = true
  const retryStart = requests.length
  const pending = Promise.all(
    Array.from({ length: 4 }, (_, index) => enqueue("tab-one:session", `fallback-${index}`)),
  )
  await vi.runAllTimersAsync()
  await pending
  const retryRequests = requests.slice(retryStart)
  expect(retryRequests.filter((request) => request.count === 4)).toHaveLength(4)
  expect(retryRequests.filter((request) => request.count === 1)).toHaveLength(4)
  expect(retryRequests.every((request) => request.session === first!.session)).toBe(true)
})
