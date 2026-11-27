import { currencySymbol } from './currencies'

export type Gateway = 'razorpay' | 'phonepe' | 'zoho'

export const GATEWAYS: Record<Gateway, { name: string, description: string }> = {
  razorpay: { name: 'Razorpay', description: 'Cards, UPI, net banking and more, for global users.' },
  zoho: { name: 'Zoho Payments', description: 'Cards, UPI, net banking and wallets, for Indian users.' },
  phonepe: { name: 'PhonePe', description: 'UPI, credit and debit cards, and net banking.' },
}

export function isGateway(value: unknown): value is Gateway {
  return value === 'razorpay' || value === 'phonepe' || value === 'zoho'
}

/** "100" with "INR" becomes "₹100"; a currency without a symbol becomes "100 XYZ". */
export function formatMoney(amount: string | number, currency: string): string {
  const symbol = currencySymbol(currency)
  return symbol === currency ? `${amount} ${currency}` : `${symbol}${amount}`
}

/**
 * Reads the amount from a payment link such as /payment/100INR, /payment/25.50GBP
 * or /payment/50 (rupees when no currency is given).
 */
export function parsePaymentParam(param: string): { amount: string, currency: string } | undefined {
  const match = /^(\d+(?:\.\d+)?)([A-Za-z]{3})?$/.exec(param.trim())
  if (!match) {
    return undefined
  }
  return { amount: match[1]!, currency: (match[2] ?? 'INR').toUpperCase() }
}

export function paymentPath(amount: string, currency: string, gateway: Gateway): string {
  return `/payment/${amount}${currency}?gateway=${gateway}`
}

const loading = new Map<string, Promise<void>>()

/** Loads a gateway's checkout script once. Rejects if it cannot be loaded. */
export function loadScript(src: string): Promise<void> {
  let pending = loading.get(src)
  if (!pending) {
    pending = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = src
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => {
        loading.delete(src)
        script.remove()
        reject(new Error('The payment window could not be loaded. Check your connection or any content blocker and try again.'))
      }
      document.head.appendChild(script)
    })
    loading.set(src, pending)
  }
  return pending
}

/** Quick amounts sized for the currency, as on the previous site. */
export function quickAmounts(currency: string): number[] {
  if (['BHD', 'IQD', 'JOD', 'KWD', 'OMR', 'TND'].includes(currency)) {
    return [1, 5, 10, 25, 50, 100]
  }
  if (['BIF', 'CLP', 'DJF', 'GNF', 'ISK', 'JPY', 'KMF', 'KRW', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'].includes(currency)) {
    return [1000, 5000, 10000, 25000, 50000, 100000]
  }
  if (['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'CHF', 'SGD', 'NZD', 'SEK', 'NOK', 'DKK'].includes(currency)) {
    return [5, 10, 25, 50, 100, 250]
  }
  if (['INR', 'CNY', 'BRL', 'MXN', 'ZAR', 'RUB', 'TRY', 'PLN', 'CZK', 'HUF', 'THB', 'MYR', 'PHP'].includes(currency)) {
    return [50, 100, 250, 500, 1000, 2500]
  }
  if (['IDR', 'LAK', 'MMK', 'UZS', 'SLL'].includes(currency)) {
    return [10000, 25000, 50000, 100000, 250000, 500000]
  }
  return [10, 25, 50, 100, 500, 1000]
}
