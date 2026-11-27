export type GatewayName = 'razorpay' | 'phonepe' | 'zoho'

/** A gateway answered with an error, or could not be reached. */
export class GatewayError extends Error {
  constructor(
    readonly gateway: GatewayName,
    /** HTTP status from the gateway, or 0 when the request itself failed. */
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`${gateway} request failed with status ${status}`)
    this.name = 'GatewayError'
  }
}

/** The gateway cannot be used because a required setting is missing or wrong. */
export class GatewayNotConfiguredError extends Error {
  constructor(readonly gateway: GatewayName, readonly reason: string) {
    super(`${gateway} is not configured: ${reason}`)
    this.name = 'GatewayNotConfiguredError'
  }
}

export async function gatewayJson<T>(gateway: GatewayName, url: string, init: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, init)
  } catch (error) {
    throw new GatewayError(gateway, 0, String(error))
  }

  const text = await response.text()
  let body: unknown
  try {
    body = text ? JSON.parse(text) : {}
  } catch {
    body = text.slice(0, 500)
  }

  if (!response.ok) {
    throw new GatewayError(gateway, response.status, body)
  }
  return body as T
}
