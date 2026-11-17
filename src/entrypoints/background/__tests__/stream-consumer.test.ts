import type { BackgroundStreamSnapshot } from "@/types/background-stream"
import { describe, expect, it } from "vitest"
import { z } from "zod"
import { consumeStructuredObjectPartStream, consumeTextPartStream } from "../stream-consumer"

const modes = ["text", "structured"] as const
type Mode = (typeof modes)[number]
// Deliberately untyped SDK input: these tests exercise malformed protocol boundaries.
async function* stream(parts: readonly unknown[]) {
  yield* parts
}
function consume(
  mode: Mode,
  parts: readonly unknown[],
  options: {
    signal?: AbortSignal
    onChunk?: (snapshot: BackgroundStreamSnapshot<string | Record<string, unknown>>) => void
  } = {},
) {
  return mode === "text"
    ? consumeTextPartStream(stream(parts), options)
    : consumeStructuredObjectPartStream(stream(parts), {
        ...options,
        objectSchema: z.object({ answer: z.string() }),
      })
}
function text(mode: Mode) {
  return mode === "text" ? "A useful answer" : '{"answer":"A useful answer"}'
}

for (const mode of modes) {
  describe(`${mode} stream protocol`, () => {
    it("keeps reasoning separate, reopens it after output, and detaches emitted snapshots", async () => {
      const snapshots: BackgroundStreamSnapshot<string | Record<string, unknown>>[] = []
      const result = await consume(
        mode,
        [
          { type: "start" },
          { type: "reasoning-start" },
          { type: "reasoning-delta", text: "First thought" },
          { type: "reasoning-file" },
          { type: "reasoning-end" },
          { type: "text-delta", text: text(mode) },
          { type: "reasoning-delta", text: "; revised" },
          { type: "text-delta", text: " " },
          { type: "finish", finishReason: "stop" },
        ],
        { onChunk: (snapshot) => snapshots.push(snapshot) },
      )
      expect(snapshots.map((snapshot) => snapshot.thinking.status)).toEqual([
        "thinking",
        "complete",
        "complete",
        "thinking",
        "complete",
      ])
      expect(snapshots[0]!.thinking.text).toBe("First thought")
      expect(result.thinking).toEqual({ status: "complete", text: "First thought; revised" })
      snapshots[0]!.thinking.text = "changed by consumer"
      expect(result.thinking.text).toBe("First thought; revised")
      expect(result.output).toEqual(
        mode === "text" ? "A useful answer " : { answer: "A useful answer" },
      )
    })

    it("finishes without requiring a chunk subscriber or model reasoning", async () => {
      const result = await consume(mode, [
        { type: "text-delta", text: text(mode) },
        { type: "finish" },
      ])
      expect(result.thinking).toEqual({ status: "complete", text: "" })
    })

    it.each([null, {}, { type: "" }, { type: "text-delta", text: 3 }, { type: "reasoning-delta" }])(
      "rejects malformed SDK input %j",
      async (part) => {
        await expect(consume(mode, [part])).rejects.toMatchObject({ code: "stream_protocol_error" })
      },
    )

    it("propagates the provider's mid-stream error", async () => {
      const error = new Error("Provider disconnected")
      await expect(consume(mode, [{ type: "error", error }])).rejects.toBe(error)
      await expect(consume(mode, [{ type: "error" }])).rejects.toMatchObject({
        code: "stream_protocol_error",
      })
    })

    it("does not treat an unfinished or truncated answer as a completed result", async () => {
      await expect(consume(mode, [{ type: "text-delta", text: text(mode) }])).rejects.toMatchObject(
        { code: "stream_protocol_error" },
      )
      await expect(
        consume(mode, [
          { type: "text-delta", text: text(mode) },
          { type: "finish", finishReason: "length" },
        ]),
      ).rejects.toMatchObject({ code: "output_validation_failed" })
    })

    it("stops consuming output after cancellation", async () => {
      const controller = new AbortController()
      controller.abort()
      await expect(
        consume(mode, [{ type: "text-delta", text: text(mode) }], { signal: controller.signal }),
      ).rejects.toMatchObject({ name: "AbortError" })
    })
  })
}

describe("structured response validation", () => {
  it("skips incomplete JSON until usable fields arrive", async () => {
    const chunks: BackgroundStreamSnapshot<string | Record<string, unknown>>[] = []
    const result = await consume(
      "structured",
      [
        { type: "text-delta", text: "{" },
        { type: "text-delta", text: '"answer":"Ready"}' },
        { type: "finish", finishReason: "stop" },
      ],
      { onChunk: (snapshot) => chunks.push(snapshot) },
    )
    expect(result.output).toEqual({ answer: "Ready" })
    expect(chunks.at(-1)?.output).toEqual({ answer: "Ready" })
  })

  it.each(['{"answer":3}', "[]", "not JSON"])(
    "rejects a completed response outside the output contract: %s",
    async (output) => {
      await expect(
        consume("structured", [
          { type: "text-delta", text: output },
          { type: "finish", finishReason: "stop" },
        ]),
      ).rejects.toMatchObject({ code: "output_validation_failed" })
    },
  )
})
