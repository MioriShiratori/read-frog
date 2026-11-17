import type { LLMProviderConfig } from "@/types/config/provider"
import { afterEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"
import { llmProviderConfigItemSchema } from "@/types/config/provider"
import { DEFAULT_PROVIDER_CONFIG } from "@/utils/constants/providers"
import { buildLocalGenerateTextParams } from "../generate-params"
import { getLanguageModelForConfig } from "../model"
import { getMinimumReasoning, getTopLevelReasoning } from "../reasoning"

const bodySchema = z.object({
  reasoning_effort: z.string().optional(),
  reasoning: z.object({ effort: z.string().optional() }).optional(),
  think: z.union([z.boolean(), z.string()]).optional(),
})

async function requestBody(config: LLMProviderConfig) {
  const requests: Request[] = []
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async (input, init) => {
      const request = new Request(input, init)
      requests.push(request)
      if (request.url.endsWith("/responses"))
        return Response.json({
          id: "resp_test",
          object: "response",
          created_at: 1,
          status: "completed",
          model: "test",
          output: [
            {
              type: "message",
              id: "msg_test",
              role: "assistant",
              content: [{ type: "output_text", text: "Translated", annotations: [] }],
            },
          ],
          usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
        })
      if (request.url.includes("/api/chat"))
        return Response.json({
          model: "test",
          created_at: "2026-11-17T00:00:00Z",
          message: { role: "assistant", content: "Translated" },
          done: true,
          prompt_eval_count: 1,
          eval_count: 1,
        })
      return Response.json({
        id: "chat_test",
        object: "chat.completion",
        created: 1,
        model: "test",
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
  await getLanguageModelForConfig(config).doGenerate({
    prompt: [{ role: "user", content: [{ type: "text", text: "Translate hello" }] }],
    ...buildLocalGenerateTextParams(config),
  })
  return bodySchema.parse(await requests[0]!.json())
}

afterEach(() => vi.unstubAllGlobals())

function configureModel(config: LLMProviderConfig, model = "local-model"): LLMProviderConfig {
  return llmProviderConfigItemSchema.parse({
    ...config,
    apiKey: "test-only",
    model: { ...config.model, isCustomModel: true, customModel: model },
  })
}

describe("reasoning configuration reaches HTTP requests", () => {
  it.each(["opencode", "lmstudio", "openai-compatible", "open-responses"] as const)(
    "sends the saved setting and defaults to none for %s",
    async (provider) => {
      const config = configureModel(DEFAULT_PROVIDER_CONFIG[provider])
      const enabled = await requestBody({ ...config, reasoning: "high" })
      const disabled = await requestBody({ ...config, reasoning: undefined })
      expect(enabled.reasoning_effort ?? enabled.reasoning?.effort).toBe("high")
      expect(disabled.reasoning_effort ?? disabled.reasoning?.effort).toBe("none")
    },
  )

  it.each(["openai", "opencode", "openai-compatible", "open-responses"] as const)(
    "uses a supported minimum for a model that rejects none through %s",
    async (provider) => {
      const config = configureModel(DEFAULT_PROVIDER_CONFIG[provider], "gpt-6-astra")
      expect(getMinimumReasoning(config)?.label).toBe("low")
      const body = await requestBody(config)
      expect(body.reasoning_effort ?? body.reasoning?.effort).toBe("low")
    },
  )

  it("maps Ollama thinking to the saved setting instead of forcing it off", async () => {
    const config = configureModel(DEFAULT_PROVIDER_CONFIG.ollama)
    expect((await requestBody({ ...config, reasoning: "high" })).think).toBe("high")
    expect((await requestBody({ ...config, reasoning: undefined })).think).toBe(false)
  })

  it("defaults an unconfigured local model to none while the model editor is empty", () => {
    expect(getTopLevelReasoning(DEFAULT_PROVIDER_CONFIG.lmstudio)).toBe("none")
    expect(getMinimumReasoning(DEFAULT_PROVIDER_CONFIG.lmstudio)).toBeUndefined()
  })

  it("preserves explicitly selected provider defaults and native overrides", async () => {
    const config = {
      ...configureModel(DEFAULT_PROVIDER_CONFIG.lmstudio),
      reasoning: "provider-default" as const,
    }
    expect(getTopLevelReasoning(config)).toBe("provider-default")
    expect(getMinimumReasoning(config)).toBeUndefined()
    const body = await requestBody({ ...config, providerOptions: { reasoningEffort: "high" } })
    expect(body.reasoning_effort).toBe("high")
  })

  it.each([
    ["gpt-5-mini", "minimal"],
    ["o3", "low"],
    ["openai/gpt-oss-120b", "low"],
    ["claude-opus-5-5", "adaptive / low"],
    ["claude-sonnet-5-5", "between_tools"],
    ["gemini-2.5-pro", "thinkingBudget: 128"],
  ])("explains the minimum required by %s", (model, minimum) => {
    const config = {
      ...DEFAULT_PROVIDER_CONFIG.lmstudio,
      model: {
        model: "use-custom-model" as const,
        isCustomModel: true as const,
        customModel: model,
      },
    }
    expect(getMinimumReasoning(config)?.label).toBe(minimum)
  })
})
