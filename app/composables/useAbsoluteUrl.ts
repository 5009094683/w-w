/**
 * Turns a site path into a full URL on the canonical origin. Structured data
 * written by hand needs absolute addresses and identifiers.
 */
export function useAbsoluteUrl() {
  const origin = useSiteConfig().url.replace(/\/+$/, '')

  return {
    absolute: (path: string) => (/^https?:/i.test(path) ? path : `${origin}${path}`),
    /** The identifier of the organization defined in app.vue. */
    organizationId: `${origin}/#identity`,
  }
}
