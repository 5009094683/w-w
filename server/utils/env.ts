import type { H3Event } from 'h3'

function clean(value: string): string {
  const trimmed = value.trim()
  const quoted = /^(["'])(.*)\1$/s.exec(trimmed)
  return quoted ? quoted[2]!.trim() : trimmed
}

/**
 * Reads a setting at request time. Every setting can be given under its plain
 * name or with a NUXT_ prefix, as on the previous site.
 *
 * On Cloudflare the values are the Worker's variables and secrets; elsewhere
 * they come from the process environment. Secrets are never built into the code.
 */
export function readEnv(event: H3Event, name: string): string | undefined {
  const worker = (event.context.cloudflare?.env ?? {}) as Record<string, unknown>

  for (const key of [`NUXT_${name}`, name]) {
    const raw = worker[key] ?? process.env[key]
    if (typeof raw === 'string') {
      const value = clean(raw)
      if (value) {
        return value
      }
    }
  }
  return undefined
}

export function readEnvFlag(event: H3Event, name: string): boolean {
  return ['true', '1', 'yes'].includes((readEnv(event, name) ?? '').toLowerCase())
}

/** One JSON line per event, so Workers Logs can search and filter it. Never pass secrets. */
export function logEvent(level: 'info' | 'error', message: string, details: Record<string, unknown> = {}) {
  const line = JSON.stringify({ message, ...details })
  if (level === 'error') {
    console.error(line)
  } else {
    console.log(line)
  }
}
