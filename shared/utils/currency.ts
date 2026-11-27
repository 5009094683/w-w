// Exponents follow Razorpay's supported-currency table:
// https://razorpay.com/docs/payments/international-payments/#supported-currencies
const ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'ISK', 'JPY', 'KMF', 'KRW',
  'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'
])

const THREE_DECIMAL_CURRENCIES = new Set(['BHD', 'IQD', 'JOD', 'KWD', 'OMR', 'TND'])

export class InvalidAmountError extends Error {
  statusCode = 400
  statusMessage: string

  constructor(message: string) {
    super(message)
    this.name = 'InvalidAmountError'
    this.statusMessage = message
  }
}

export function normalizeCurrency(currency: unknown): string {
  const code = typeof currency === 'string' ? currency.trim().toUpperCase() : ''

  if (!/^[A-Z]{3}$/.test(code)) {
    throw new InvalidAmountError('Currency must be a 3-letter ISO code')
  }

  return code
}

export function currencyExponent(currency: string): 0 | 2 | 3 {
  if (ZERO_DECIMAL_CURRENCIES.has(currency)) {
    return 0
  }

  return THREE_DECIMAL_CURRENCIES.has(currency) ? 3 : 2
}

/**
 * Converts an amount in major units (rupees, dollars, yen) to the integer
 * number of smallest units a gateway expects (paise, cents, yen).
 *
 * Works on the decimal digits rather than multiplying floats, so 19.99 becomes
 * 1999 and not 1998.9999999999998. An amount with more decimals than the
 * currency can carry is rejected instead of rounded, so a customer is never
 * charged a different amount from the one shown.
 */
export function toMinorUnits(amount: unknown, currency: unknown): number {
  const code = normalizeCurrency(currency)
  const exponent = currencyExponent(code)

  let text: string
  if (typeof amount === 'number' && Number.isFinite(amount)) {
    text = String(amount)
  } else if (typeof amount === 'string') {
    text = amount.trim()
  } else {
    throw new InvalidAmountError('Amount must be a number')
  }

  const match = /^(\d+)(?:\.(\d+))?$/.exec(text)
  if (!match) {
    throw new InvalidAmountError('Amount must be a positive number')
  }

  const whole = match[1] as string
  const fraction = (match[2] ?? '').replace(/0+$/, '')

  // Razorpay requires the third decimal of three-decimal currencies to be 0.
  const maxDecimals = exponent === 3 ? 2 : exponent

  if (fraction.length > maxDecimals) {
    throw new InvalidAmountError(
      maxDecimals === 0
        ? `${code} amounts cannot have decimals`
        : `${code} amounts can have at most ${maxDecimals} decimal places`
    )
  }

  // With at most 12 whole digits the result is far below 2^53, so the integer
  // arithmetic below is exact.
  if (whole.replace(/^0+/, '').length > 12) {
    throw new InvalidAmountError('Amount is too large')
  }

  const minor = Number(whole) * (10 ** exponent) + Number(fraction.padEnd(exponent, '0') || '0')

  if (minor <= 0) {
    throw new InvalidAmountError('Amount must be greater than zero')
  }

  return minor
}

export function fromMinorUnits(minorAmount: number, currency: unknown): number {
  return minorAmount / (10 ** currencyExponent(normalizeCurrency(currency)))
}

/** Why an amount cannot be charged in a currency, or undefined when it can. */
export function amountProblem(amount: unknown, currency: unknown): string | undefined {
  try {
    toMinorUnits(amount, currency)
    return undefined
  } catch (error) {
    return error instanceof InvalidAmountError ? error.message : 'Amount must be a positive number'
  }
}
