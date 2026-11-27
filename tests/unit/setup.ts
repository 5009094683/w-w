import { createError } from 'h3'
import { beforeEach, vi } from 'vitest'

// The server code uses helpers that Nitro imports automatically. These tests
// call the route handlers directly, so they provide the few that are needed.

export interface TestEvent {
  body?: unknown
  url?: string
  context: { cloudflare: { env: Record<string, string> } }
}

/** A request as a route handler sees it, with the Worker's variables and secrets. */
export function request(body: unknown, env: Record<string, string> = {}, url = 'https://ybxlabs.test/api/test'): TestEvent {
  return { body, url, context: { cloudflare: { env } } }
}

export interface GatewayCall {
  url: string
  method: string
  headers: Record<string, string>
  body: string
}

export const calls: GatewayCall[] = []

type Responder = (call: GatewayCall) => unknown

let responder: Responder = (call) => {
  throw new Error(`Unexpected outbound request to ${call.url}`)
}

/** Sets what the mocked outside world answers. Return a Response, or any value to send it as JSON. */
export function respond(next: Responder) {
  responder = next
}

export function callsTo(prefix: string) {
  return calls.filter(call => call.url.startsWith(prefix))
}

vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
vi.stubGlobal('createError', createError)
vi.stubGlobal('readBody', async (event: TestEvent) => event.body)
vi.stubGlobal('getRequestIP', () => '203.0.113.7')
vi.stubGlobal('getRequestURL', (event: TestEvent) => new URL(event.url ?? 'https://ybxlabs.test/'))
vi.stubGlobal('setResponseHeader', () => {})

beforeEach(() => {
  calls.length = 0
  responder = (call) => {
    throw new Error(`Unexpected outbound request to ${call.url}`)
  }

  vi.stubGlobal('fetch', async (input: string | URL, init: RequestInit = {}) => {
    const call: GatewayCall = {
      url: String(input),
      method: init.method ?? 'GET',
      headers: Object.fromEntries(new Headers(init.headers).entries()),
      body: init.body == null ? '' : String(init.body),
    }
    calls.push(call)

    const answer = await responder(call)
    return answer instanceof Response
      ? answer
      : new Response(JSON.stringify(answer), { status: 200, headers: { 'content-type': 'application/json' } })
  })

  // Failures are logged as JSON lines; keep the test output readable.
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'log').mockImplementation(() => {})
})
