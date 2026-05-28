export function parseEnvBool(value: unknown): boolean {
  if (value === true || value === false) {
    return value
  }

  if (value === undefined || value === null || value === '') {
    return false
  }

  const normalized = String(value).trim().toLowerCase()

  return normalized === 'true' || normalized === '1' || normalized === 'yes'
}

export function cleanEnvValue(value: string): string {
  let cleaned = value.trim()

  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"'))
    || (cleaned.startsWith('\'') && cleaned.endsWith('\''))
  ) {
    cleaned = cleaned.slice(1, -1).trim()
  }

  return cleaned
}

export function readEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    const raw = process.env[key]

    if (!raw) {
      continue
    }

    const value = cleanEnvValue(raw)

    if (value) {
      return value
    }
  }
}

export function maskKeyId(keyId?: string) {
  if (!keyId) {
    return 'missing'
  }

  if (keyId.length <= 14) {
    return keyId
  }

  return `${keyId.slice(0, 12)}...`
}
