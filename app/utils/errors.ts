/** The message a failed API call carries, or the fallback when it has none. */
export function fetchErrorMessage(error: unknown, fallback: string): string {
  const data = (error as { data?: { statusMessage?: string, message?: string } } | null)?.data
  return data?.statusMessage || data?.message || fallback
}
