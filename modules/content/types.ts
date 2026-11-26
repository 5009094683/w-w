import type { SiteInput } from './schema'
import type { Heading } from './markdown'

export type { Heading }

/** Markdown rendered to HTML, with a plain-text copy for structured data. */
export interface Rich {
  html: string
  text: string
}

export interface Link {
  label: string
  href: string
}

export interface PageMeta {
  path: string
  title: string
  description: string
  updatedAt: string
}

export interface Fact {
  label: string
  value: Rich
}

export interface Question {
  q: string
  a: Rich
  /** False when the question is shown on the page but left out of the structured data. */
  structured?: boolean
}

export interface Step {
  title: string
  text: Rich
}

export interface Feature {
  title: string
  text: Rich
}

export interface ContentImage {
  src: string
  alt: string
  caption?: string
  width: number
  height: number
}

export interface Body {
  html: string
  text: string
  headings: Heading[]
}

export type Site = SiteInput

export interface Service extends PageMeta {
  slug: string
  name: string
  navTitle: string
  code: string
  order: number
  summary: Rich
  facts: Fact[]
  process: Step[]
  faq: Question[]
  /** Paths of related pages. */
  related: string[]
  body: Body
}

export interface Product extends PageMeta {
  slug: string
  name: string
  navTitle: string
  code: string
  order: number
  category: string
  website?: Link
  summary: Rich
  facts: Fact[]
  features: Feature[]
  figures: ContentImage[]
  faq: Question[]
  related: string[]
  body: Body
}

export interface Job extends PageMeta {
  slug: string
  order: number
  department: string
  location: string
  employmentType: string
  experience: string
  summary: Rich
  datePosted?: string
  validThrough?: string
  applicantCountries?: string[]
  body: Body
}

export interface Legal extends PageMeta {
  slug: string
  heading: string
  effectiveDate: string
  body: Body
}

export interface Home extends PageMeta {
  hero: { eyebrow: string, heading: string, lead: Rich, primary: Link, secondary: Link }
  products: { heading: string, lead: Rich }
  services: { heading: string, lead: Rich }
  highlights: { heading: string, lead: Rich, more: Link, items: Feature[] }
  showcase: { label: string, heading: string, text: Rich, action: Link, more: Link }
  process: { heading: string, lead: Rich, more: Link }
  faq: { heading: string, lead: Rich, more: Link }
  cta: { heading: string, text: Rich, action: Link }
}

export interface Hub extends PageMeta {
  heading: string
  lead: Rich
  faq: Question[]
  body: Body
}

export interface About extends PageMeta {
  heading: string
  lead: Rich
  body: Body
}

export interface Careers extends PageMeta {
  heading: string
  lead: Rich
  perks: Feature[]
  openings: { heading: string, lead: Rich }
  apply: { heading: string, lead: Rich, steps: Step[], openApplication: Rich }
}

export interface Contact extends PageMeta {
  heading: string
  lead: Rich
}

export interface Pricing extends PageMeta {
  heading: string
  lead: Rich
  prices: Array<{ name: string, price: string, about: Rich, href: string }>
  body: Body
}

export interface FaqGroup {
  title: string
  id: string
  items: Array<Question & { home?: boolean }>
}

export interface Faq extends PageMeta {
  heading: string
  lead: Rich
  groups: FaqGroup[]
}

export interface GlossaryTerm {
  term: string
  id: string
  aka: string[]
  definition: Rich
  see?: Link
}

export interface Glossary extends PageMeta {
  heading: string
  lead: Rich
  terms: GlossaryTerm[]
}

/** One entry per page built from content/, used for prerendering, the sitemap and llms.txt. */
export interface RouteInfo extends PageMeta {
  section: 'home' | 'services' | 'products' | 'company' | 'careers' | 'legal'
  /** A one or two sentence plain-text summary. */
  summary: string
}

export interface ContentData {
  site: Site
  home: Home
  servicesHub: Hub
  productsHub: Hub
  about: About
  careers: Careers
  contact: Contact
  pricing: Pricing
  faq: Faq
  glossary: Glossary
  services: Service[]
  products: Product[]
  jobs: Job[]
  legal: Legal[]
  routes: RouteInfo[]
}
