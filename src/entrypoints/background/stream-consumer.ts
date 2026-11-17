import type {
  BackgroundStreamSnapshot,
  BackgroundTextStreamSnapshot,
  BackgroundStructuredObjectStreamSnapshot,
  StreamRuntimeOptions,
  ThinkingSnapshot,
} from "@/types/background-stream"
import type { ErrorAction } from "@/utils/error-action"
import { parsePartialJson } from "ai"
import { z } from "zod"
// Unknown values below are SDK stream input and error payloads, validated at this boundary.
type AiStreamPart = Record<string, unknown> & { type: string }
const aiStreamProtocolErrorMessage = "Invalid AI stream response."
const aiOutputValidationErrorMessage = "AI output does not match the expected format."
const aiOutputLengthLimitErrorMessage =
  "The AI output reached the length limit. Please reduce the requested output length and try again."
function createStreamSnapshot<TOutput>(
  output: TOutput,
  thinking: ThinkingSnapshot,
): BackgroundStreamSnapshot<TOutput> {
  return {
    output: output !== null && typeof output === "object" ? { ...output } : output,
    thinking: { ...thinking },
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

export class BackgroundStreamError extends Error {
  constructor(
    readonly code: string,
    message: string,
    options?: { cause?: unknown; retryAfterMs?: number; action?: ErrorAction },
  ) {
    super(message, { cause: options?.cause })
    this.retryAfterMs = options?.retryAfterMs
    this.action = options?.action
  }

  readonly retryAfterMs?: number
  readonly action?: ErrorAction
}

function toAiStreamPart(part: unknown): AiStreamPart {
  if (!isRecord(part) || typeof part.type !== "string" || part.type.trim().length === 0) {
    throw new BackgroundStreamError("stream_protocol_error", aiStreamProtocolErrorMessage)
  }

  return part as AiStreamPart
}

function getStringPartField(part: Record<string, unknown>, field: string): string {
  const value = part[field]
  if (typeof value !== "string") {
    throw new BackgroundStreamError("stream_protocol_error", aiStreamProtocolErrorMessage)
  }

  return value
}

function getStreamPartError(part: Record<string, unknown>): unknown {
  return "error" in part
    ? part.error
    : new BackgroundStreamError("stream_protocol_error", aiStreamProtocolErrorMessage)
}

function getStreamFinishReason(part: Record<string, unknown>): string | undefined {
  return typeof part.finishReason === "string" ? part.finishReason : undefined
}

/**
 * Reasoning is over once the answer starts coming out, so the first output delta
 * closes the thinking phase. Models that emit no reasoning at all never send
 * `reasoning-end`, and without this they would stay "thinking" for the whole
 * stream while their output is already rendering. Models that interleave need no
 * special case: a later `reasoning-delta` reopens the phase on its own.
 */
function endThinkingOnOutput(thinking: ThinkingSnapshot): ThinkingSnapshot {
  return thinking.status === "thinking" ? { ...thinking, status: "complete" } : thinking
}

function validateFinishedStream(hasFinish: boolean, finishReason: string | undefined): void {
  if (!hasFinish) {
    throw new BackgroundStreamError("stream_protocol_error", aiStreamProtocolErrorMessage)
  }

  if (finishReason === "length") {
    throw new BackgroundStreamError("output_validation_failed", aiOutputLengthLimitErrorMessage)
  }
}

export async function consumeTextPartStream(
  partStream: AsyncIterable<unknown>,
  options: {
    onChunk?: StreamRuntimeOptions<BackgroundTextStreamSnapshot>["onChunk"]
    signal?: AbortSignal
  },
): Promise<BackgroundTextStreamSnapshot> {
  const { onChunk, signal } = options
  let cumulativeText = ""
  let thinking: ThinkingSnapshot = {
    status: "thinking",
    text: "",
  }
  let hasFinish = false
  let finishReason: string | undefined

  for await (const rawPart of partStream) {
    if (signal?.aborted) {
      throw new DOMException("stream aborted", "AbortError")
    }

    const part = toAiStreamPart(rawPart)
    switch (part.type) {
      case "text-delta": {
        cumulativeText += getStringPartField(part, "text")
        thinking = endThinkingOnOutput(thinking)
        onChunk?.(createStreamSnapshot(cumulativeText, thinking))
        break
      }
      case "reasoning-start": {
        thinking = {
          ...thinking,
          status: "thinking",
        }
        break
      }
      case "reasoning-delta": {
        thinking = {
          status: "thinking",
          text: thinking.text + getStringPartField(part, "text"),
        }
        onChunk?.(createStreamSnapshot(cumulativeText, thinking))
        break
      }
      case "reasoning-end": {
        thinking = {
          ...thinking,
          status: "complete",
        }
        onChunk?.(createStreamSnapshot(cumulativeText, thinking))
        break
      }
      case "reasoning-file": {
        break
      }
      case "finish": {
        hasFinish = true
        finishReason = getStreamFinishReason(part)
        break
      }
      case "error": {
        throw getStreamPartError(part)
      }
      default: {
        break
      }
    }
  }

  validateFinishedStream(hasFinish, finishReason)

  thinking = {
    ...thinking,
    status: "complete",
  }

  return createStreamSnapshot(cumulativeText, thinking)
}

export async function consumeStructuredObjectPartStream<TOutput extends Record<string, unknown>>(
  partStream: AsyncIterable<unknown>,
  options: {
    objectSchema: z.ZodType<TOutput>
    onChunk?: StreamRuntimeOptions<BackgroundStructuredObjectStreamSnapshot>["onChunk"]
    signal?: AbortSignal
  },
): Promise<BackgroundStreamSnapshot<TOutput>> {
  const { objectSchema, onChunk, signal } = options
  let cumulativeText = ""
  let cumulativeValue: Record<string, unknown> = {}
  let thinking: ThinkingSnapshot = {
    status: "thinking",
    text: "",
  }
  let hasFinish = false
  let finishReason: string | undefined

  for await (const rawPart of partStream) {
    if (signal?.aborted) {
      throw new DOMException("stream aborted", "AbortError")
    }

    const part = toAiStreamPart(rawPart)
    switch (part.type) {
      case "text-delta": {
        cumulativeText += getStringPartField(part, "text")
        thinking = endThinkingOnOutput(thinking)
        const partial = await parsePartialJson(cumulativeText)
        if (isRecord(partial.value)) {
          cumulativeValue = { ...cumulativeValue, ...partial.value }
          onChunk?.(createStreamSnapshot(cumulativeValue, thinking))
        }
        break
      }
      case "reasoning-start": {
        thinking = {
          ...thinking,
          status: "thinking",
        }
        break
      }
      case "reasoning-delta": {
        thinking = {
          status: "thinking",
          text: thinking.text + getStringPartField(part, "text"),
        }
        onChunk?.(createStreamSnapshot(cumulativeValue, thinking))
        break
      }
      case "reasoning-end": {
        thinking = {
          ...thinking,
          status: "complete",
        }
        onChunk?.(createStreamSnapshot(cumulativeValue, thinking))
        break
      }
      case "reasoning-file": {
        break
      }
      case "finish": {
        hasFinish = true
        finishReason = getStreamFinishReason(part)
        break
      }
      case "error": {
        throw getStreamPartError(part)
      }
      default: {
        break
      }
    }
  }

  validateFinishedStream(hasFinish, finishReason)

  try {
    const finalJson = await parsePartialJson(cumulativeText)
    const finalValue = objectSchema.parse(finalJson.value)
    thinking = {
      ...thinking,
      status: "complete",
    }

    return createStreamSnapshot(finalValue, thinking)
  } catch (error) {
    throw new BackgroundStreamError("output_validation_failed", aiOutputValidationErrorMessage, {
      cause: error,
    })
  }
}
