const longDate = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' })

/** "2026-04-24" becomes "April 24, 2026". */
export function formatDate(isoDate: string): string {
  return longDate.format(new Date(`${isoDate}T00:00:00Z`))
}

/** Two-digit section numbers: 1 becomes "01". */
export function sectionNumber(index: number): string {
  return String(index).padStart(2, '0')
}

/** The first sentences of a plain-text paragraph, for short previews. */
export function firstSentences(text: string, count: number): string {
  const sentences = text.match(/[^.!?]+[.!?]+(?=\s|$)/g) ?? [text]
  return sentences.slice(0, count).join('').trim()
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}
