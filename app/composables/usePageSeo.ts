interface Crumb {
  label: string
  to: string
}

interface SeoQuestion {
  q: string
  a: { text: string }
  structured?: boolean
}

type PageType = 'AboutPage' | 'ContactPage' | 'CollectionPage' | 'ItemPage'

export interface PageSeo {
  path: string
  /** Browser tab and search result title. The site name is added unless it is already there. */
  title: string
  /** Search result description. */
  description: string
  updatedAt: string
  /** A factual plain-text summary for structured data. Defaults to the description. */
  summary?: string
  /** The page heading, shown on the share image. Defaults to the title. */
  heading?: string
  /** Small label on the share image, for example "Service S-01". */
  label?: string
  crumbs?: Crumb[]
  schemaType?: PageType
  /** Questions that are visible on the page. They are added to the structured data. */
  faq?: SeoQuestion[]
}

/**
 * Everything a content page needs in its <head>: title, description, share
 * image, last-modified date, and the WebPage, breadcrumb and question
 * structured data.
 */
export function usePageSeo(page: PageSeo) {
  const hasSiteName = page.title.includes('YBX Labs')
  const modified = `${page.updatedAt}T00:00:00Z`
  const heading = page.heading ?? page.title

  useHead({ titleTemplate: hasSiteName ? '%s' : '%s %separator %siteName' })

  useSeoMeta({
    title: page.title,
    description: page.description,
    ogType: 'website',
    articleModifiedTime: modified,
  })

  defineOgImage('Card', { title: heading, label: page.label ?? 'ybxlabs.com' })

  const questions = (page.faq ?? []).filter(item => item.structured !== false)
  const types: Array<'WebPage' | 'FAQPage' | PageType> = ['WebPage']
  if (page.schemaType) {
    types.push(page.schemaType)
  }
  if (questions.length) {
    types.push('FAQPage')
  }

  useSchemaOrg([
    defineWebPage({
      '@type': types,
      'name': heading,
      'description': page.summary ?? page.description,
      'dateModified': modified,
    }),
    ...(page.path === '/'
      ? []
      : [defineBreadcrumb({
          itemListElement: [
            { name: 'Home', item: '/' },
            ...(page.crumbs ?? []).filter(crumb => crumb.to !== '/').map(crumb => ({ name: crumb.label, item: crumb.to })),
            { name: heading, item: page.path },
          ],
        })]),
    ...questions.map(item => defineQuestion({ name: item.q, acceptedAnswer: item.a.text })),
  ])
}
