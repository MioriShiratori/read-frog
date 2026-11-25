import { EXTENSION_VERSION } from "@/utils/constants/app"
import { getRandomUUID } from "@/utils/crypto-polyfill"
import { Sha256Hex } from "@/utils/hash"

const sessions = new WeakMap<AbortSignal, string>()
let backgroundSession: string | undefined

export interface OpenCodeSessionContext {
  /** Stable conversation identity, independent of individual request cancellation. */
  sessionId?: string
  signal?: AbortSignal
}

function getRoutingSession({ sessionId, signal }: OpenCodeSessionContext): string {
  if (sessionId) {
    // Page session IDs already contain randomness. Hashing them directly keeps
    // the routing identity stable when an event background restarts too.
    return `read-frog-${Sha256Hex(sessionId).slice(0, 32)}`
  }
  let routingSession = signal ? sessions.get(signal) : backgroundSession
  if (!routingSession) {
    routingSession = `read-frog-${getRandomUUID()}`
    if (signal) sessions.set(signal, routingSession)
    else backgroundSession = routingSession
  }
  return routingSession
}

export function getOpenCodeHeaders(
  context: OpenCodeSessionContext = {},
  configuredHeaders?: Record<string, string>,
): Record<string, string> {
  const headers = new Headers(configuredHeaders)
  headers.set("User-Agent", `ReadFrog/${EXTENSION_VERSION}`)
  headers.set("x-opencode-session", getRoutingSession(context))
  return Object.fromEntries(headers.entries())
}

/** The AI SDK adds call-level headers after provider defaults, so apply identity at the wire boundary. */
export function createOpenCodeFetch(context: OpenCodeSessionContext = {}): typeof fetch {
  const identity = getOpenCodeHeaders(context)
  return (input, init) => {
    const headers = new Headers(
      init?.headers ?? (input instanceof Request ? input.headers : undefined),
    )
    for (const [key, value] of Object.entries(identity)) headers.set(key, value)
    return fetch(input, { ...init, headers })
  }
}
