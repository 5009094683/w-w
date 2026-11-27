import { vi } from 'vitest'

// The server code relies on helpers that Nitro auto-imports. The tests run the
// handlers directly, without Nitro, so they provide minimal stand-ins.

export interface TestEvent {
  body?: unknown
  headers?: Record<string, string>
}

export const runtimeConfig: Record<string, unknown> = {}

vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
vi.stubGlobal('readBody', async (event: TestEvent) => event.body)
vi.stubGlobal('useRuntimeConfig', () => runtimeConfig)
vi.stubGlobal('getRequestHeader', (event: TestEvent, name: string) => event.headers?.[name.toLowerCase()])
vi.stubGlobal('getRequestIP', () => undefined)
vi.stubGlobal('createError', (input: { statusCode?: number, statusMessage?: string, data?: unknown }) =>
  Object.assign(new Error(input.statusMessage), input)
)
