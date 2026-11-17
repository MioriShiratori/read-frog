import { EXTENSION_VERSION } from "@/utils/constants/app"
import { getRandomUUID } from "@/utils/crypto-polyfill"

const sessions = new WeakMap<AbortSignal, string>()
let backgroundSession: string | undefined

/** Related queue calls share their cancellation signal, and therefore their routing session. */
export function getOpenCodeHeaders(
  signal?: AbortSignal,
  configuredHeaders?: Record<string, string>,
): Record<string, string> {
  let sessionId = signal ? sessions.get(signal) : backgroundSession
  if (!sessionId) {
    sessionId = `read-frog-${getRandomUUID()}`
    if (signal) sessions.set(signal, sessionId)
    else backgroundSession = sessionId
  }
  const headers = new Headers(configuredHeaders)
  headers.set("User-Agent", `ReadFrog/${EXTENSION_VERSION}`)
  headers.set("x-opencode-session", sessionId)
  return Object.fromEntries(headers.entries())
}

/** The AI SDK adds call-level headers after provider defaults, so apply identity at the wire boundary. */
export function createOpenCodeFetch(signal?: AbortSignal): typeof fetch {
  const identity = getOpenCodeHeaders(signal)
  return (input, init) => {
    const headers = new Headers(
      init?.headers ?? (input instanceof Request ? input.headers : undefined),
    )
    for (const [key, value] of Object.entries(identity)) headers.set(key, value)
    return fetch(input, { ...init, headers })
  }
}
