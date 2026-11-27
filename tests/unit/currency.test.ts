import { describe, expect, it } from 'vitest'
import { amountProblem, currencyExponent, fromMinorUnits, InvalidAmountError, toMinorUnits } from '#shared/utils/currency'

describe('toMinorUnits', () => {
  it('multiplies two-decimal currencies by 100', () => {
    expect(toMinorUnits(100, 'INR')).toBe(10000)
    expect(toMinorUnits(50, 'USD')).toBe(5000)
    expect(toMinorUnits(25.5, 'GBP')).toBe(2550)
    expect(toMinorUnits(0.01, 'EUR')).toBe(1)
  })

  it('does not lose a unit to floating point', () => {
    // 19.99 * 100 === 1998.9999999999998 in JavaScript
    expect(toMinorUnits(19.99, 'USD')).toBe(1999)
    expect(toMinorUnits(1.15, 'INR')).toBe(115)
    expect(toMinorUnits(4.35, 'EUR')).toBe(435)
  })

  it('passes zero-decimal currencies through unchanged', () => {
    expect(toMinorUnits(1000, 'JPY')).toBe(1000)
    expect(toMinorUnits(50000, 'KRW')).toBe(50000)
    expect(toMinorUnits(100000, 'VND')).toBe(100000)
    expect(toMinorUnits(295, 'ISK')).toBe(295)
  })

  it('multiplies three-decimal currencies by 1000', () => {
    expect(toMinorUnits(5, 'KWD')).toBe(5000)
    expect(toMinorUnits(295.99, 'BHD')).toBe(295990)
    expect(toMinorUnits(1.5, 'OMR')).toBe(1500)
  })

  it('rejects decimals the currency cannot carry instead of rounding', () => {
    expect(() => toMinorUnits(100.5, 'JPY')).toThrow('JPY amounts cannot have decimals')
    expect(() => toMinorUnits(10.555, 'USD')).toThrow('USD amounts can have at most 2 decimal places')
    // Razorpay requires the third decimal of three-decimal currencies to be 0
    expect(() => toMinorUnits(99.991, 'KWD')).toThrow('KWD amounts can have at most 2 decimal places')
  })

  it('ignores trailing zeros', () => {
    expect(toMinorUnits('100.00', 'JPY')).toBe(100)
    expect(toMinorUnits('10.500', 'USD')).toBe(1050)
    expect(toMinorUnits('99.990', 'KWD')).toBe(99990)
  })

  it('accepts numeric strings and lower-case currency codes', () => {
    expect(toMinorUnits('250', 'inr')).toBe(25000)
    expect(toMinorUnits(' 12.34 ', ' usd ')).toBe(1234)
  })

  it('stays exact for the largest amounts it accepts', () => {
    expect(toMinorUnits('999999999999.99', 'INR')).toBe(99999999999999)
    expect(toMinorUnits('999999999999.99', 'KWD')).toBe(999999999999990)
    expect(toMinorUnits('000000000000100', 'INR')).toBe(10000)
  })

  it('rejects amounts that are not positive numbers', () => {
    for (const bad of [0, -5, Number.NaN, Number.POSITIVE_INFINITY, '', 'abc', '1e3', '10,50', null, undefined, {}, [100], true]) {
      expect(() => toMinorUnits(bad, 'INR'), String(bad)).toThrow(InvalidAmountError)
    }
    expect(() => toMinorUnits(1e21, 'INR')).toThrow(InvalidAmountError)
    expect(() => toMinorUnits('1000000000000', 'INR')).toThrow('Amount is too large')
    expect(() => toMinorUnits('99999999999999999999', 'INR')).toThrow('Amount is too large')
  })

  it('rejects malformed currency codes', () => {
    for (const bad of ['', 'RS', 'RUPEE', 'U$D', 123, null, undefined]) {
      expect(() => toMinorUnits(100, bad), String(bad)).toThrow('Currency must be a 3-letter ISO code')
    }
  })

  it('reports errors as HTTP 400', () => {
    try {
      toMinorUnits(100.5, 'JPY')
      expect.unreachable()
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidAmountError)
      expect((error as InvalidAmountError).statusCode).toBe(400)
      expect((error as InvalidAmountError).statusMessage).toBe('JPY amounts cannot have decimals')
    }
  })
})

describe('fromMinorUnits', () => {
  it('reverses the conversion for each kind of currency', () => {
    expect(fromMinorUnits(10000, 'INR')).toBe(100)
    expect(fromMinorUnits(1999, 'USD')).toBe(19.99)
    expect(fromMinorUnits(1000, 'JPY')).toBe(1000)
    expect(fromMinorUnits(295990, 'KWD')).toBe(295.99)
  })

  it('round-trips every exponent', () => {
    for (const [amount, currency] of [[1234.56, 'INR'], [98765, 'JPY'], [12.34, 'BHD'], [0.5, 'USD']] as const) {
      expect(fromMinorUnits(toMinorUnits(amount, currency), currency)).toBe(amount)
    }
  })
})

describe('amountProblem', () => {
  it('returns nothing for an amount that can be charged', () => {
    expect(amountProblem('100', 'INR')).toBeUndefined()
    expect(amountProblem('1000', 'JPY')).toBeUndefined()
  })

  it('explains what is wrong otherwise', () => {
    expect(amountProblem('100.5', 'JPY')).toBe('JPY amounts cannot have decimals')
    expect(amountProblem('', 'INR')).toBe('Amount must be a positive number')
    expect(amountProblem('0', 'INR')).toBe('Amount must be greater than zero')
  })
})

describe('currencyExponent', () => {
  it('matches Razorpay\'s published exponents', () => {
    const zero = ['BIF', 'CLP', 'DJF', 'GNF', 'ISK', 'JPY', 'KMF', 'KRW', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF']
    const three = ['BHD', 'IQD', 'JOD', 'KWD', 'OMR', 'TND']

    for (const code of zero) expect(currencyExponent(code), code).toBe(0)
    for (const code of three) expect(currencyExponent(code), code).toBe(3)
    for (const code of ['INR', 'USD', 'EUR', 'GBP', 'AED', 'HUF', 'IDR', 'TWD']) expect(currencyExponent(code), code).toBe(2)
  })
})
