import type { OcrWorkerResponse } from "../types"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { ImageOcrJobs } from "../ocr-jobs"

class TestWorker {
  static instances: TestWorker[] = []
  static failPost = false
  onmessage: ((event: { data: OcrWorkerResponse }) => void) | null = null
  onerror: ((event: { message: string }) => void) | null = null
  terminate = vi.fn<() => void>()
  postMessage = vi.fn<() => void>(() => {
    if (TestWorker.failPost) throw new Error("Cannot clone request")
  })
  constructor() {
    TestWorker.instances.push(this)
  }
  reply(data: OcrWorkerResponse) {
    this.onmessage?.({ data })
  }
}
const result = { width: 10, height: 10, blocks: [] }
beforeEach(() => {
  vi.useFakeTimers()
  TestWorker.instances = []
  TestWorker.failPost = false
  vi.stubGlobal("Worker", TestWorker)
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it("accepts only the matching worker result and frees its slot", async () => {
  const jobs = new ImageOcrJobs()
  const work = jobs.run(1, "job", "image")
  const worker = TestWorker.instances[0]!
  worker.reply({ id: "other", ok: true, result })
  expect(worker.terminate).not.toHaveBeenCalled()
  worker.reply({ id: "job", ok: true, result })
  await expect(work).resolves.toEqual(result)
  expect(worker.terminate).toHaveBeenCalledOnce()
  const retry = jobs.run(1, "job", "image")
  worker.reply({ id: "job", ok: true, result }) // A queued old event must not free the retry's slot.
  const duplicate = jobs.run(1, "job", "image")
  await expect(duplicate).rejects.toThrow("IMAGE_REQUEST_DUPLICATED")
  TestWorker.instances[1]!.reply({ id: "job", ok: true, result })
  await retry
})

it("bounds parallel recognition and cancels only the specified tab", async () => {
  const jobs = new ImageOcrJobs()
  const first = jobs.run(1, "job", "image")
  void first.catch(() => {})
  const other = jobs.run(10, "job", "image")
  const third = jobs.run(2, "job", "image")
  void third.catch(() => {})
  expect(TestWorker.instances).toHaveLength(2)
  await expect(third).rejects.toThrow("IMAGE_OCR_BUSY")
  jobs.cancelTab(1)
  await expect(first).rejects.toThrow("IMAGE_CANCELLED")
  expect(TestWorker.instances[1]!.terminate).not.toHaveBeenCalled()
  TestWorker.instances[1]!.reply({ id: "job", ok: true, result })
  await other
})

it("terminates timed-out workers and allows a new attempt", async () => {
  const jobs = new ImageOcrJobs()
  const work = jobs.run(1, "job", "image")
  void work.catch(() => {})
  await vi.advanceTimersByTimeAsync(120000)
  await expect(work).rejects.toThrow("IMAGE_OCR_TIMEOUT")
  expect(TestWorker.instances[0]!.terminate).toHaveBeenCalledOnce()
  const retry = jobs.run(1, "job", "image")
  void retry.catch(() => {})
  jobs.cancel(1, "job")
  await expect(retry).rejects.toThrow("IMAGE_CANCELLED")
})

it.each(["response", "worker"])("releases failed workers (%s)", async (failure) => {
  const jobs = new ImageOcrJobs()
  const work = jobs.run(1, "job", "image")
  void work.catch(() => {})
  const worker = TestWorker.instances[0]!
  if (failure === "response") worker.reply({ id: "job", ok: false, error: "broken model" })
  else worker.onerror?.({ message: "broken model" })
  await expect(work).rejects.toThrow("broken model")
  expect(worker.terminate).toHaveBeenCalledOnce()
  expect(vi.getTimerCount()).toBe(0)
})

it("cleans up when posting a worker request fails before inference starts", async () => {
  TestWorker.failPost = true
  const jobs = new ImageOcrJobs()
  await expect(jobs.run(1, "job", "image")).rejects.toThrow("Cannot clone request")
  expect(TestWorker.instances[0]!.terminate).toHaveBeenCalledOnce()
  expect(vi.getTimerCount()).toBe(0)
})
