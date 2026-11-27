import { z } from 'zod'

// The contract for everything under content/. A file that breaks it fails the
// build with the file name and the field, so a page can never ship without a
// title, a description, a last-updated date or a description for each image.

const text = (min = 1) => z.string().trim().min(min)

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u, 'Use the format YYYY-MM-DD').refine((value) => {
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}, 'Not a real date')

const href = z.string().regex(/^(\/|https:\/\/|mailto:|tel:)/u, 'Use a path starting with / or a full https:, mailto: or tel: link')

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u, 'Use lower-case letters, digits and hyphens')

const link = z.strictObject({ label: text(), href })

const page = {
  /** Shown in the browser tab and in search results. */
  title: text(3).max(70),
  /** Shown under the title in search results. Aim for 160 characters or fewer. */
  description: text(50).max(400),
  updatedAt: date,
}

const image = z.strictObject({
  src: z.string().regex(/^\/images\/[\w./-]+\.(?:png|jpe?g|webp)$/u, 'Use a file under public/images/'),
  alt: text(10),
  caption: text().optional(),
})

const fact = z.strictObject({ label: text(), value: text() })
const question = z.strictObject({
  q: text(8),
  a: text(20),
  /** Set to false to show the question on the page but leave it out of the structured data. */
  structured: z.boolean().optional(),
})
const step = z.strictObject({ title: text(), text: text(10) })
const feature = z.strictObject({ title: text(), text: text(10) })

export const siteSchema = z.strictObject({
  name: text(),
  formerName: text(),
  tagline: text(),
  description: text(50),
  registration: z.strictObject({ scheme: text(), number: text() }),
  workingModel: text(),
  governingLaw: text(),
  address: z.strictObject({
    careOf: text(),
    street: text(),
    locality: text(),
    district: text(),
    region: text(),
    postalCode: text(),
    country: text(),
    countryCode: z.string().length(2),
  }),
  contact: z.strictObject({
    email: z.email(),
    phone: z.string().regex(/^\+[\d ]+$/u, 'Use the international format, for example +91 63535 86391'),
    telegram: z.strictObject({ handle: text(), url: href }),
    responseTime: text(),
  }),
  social: z.array(z.strictObject({
    name: text(),
    url: href,
    icon: z.enum(['telegram', 'linkedin', 'github', 'x']),
  })).min(1),
  navigation: z.array(link).min(1),
})

export const serviceSchema = z.strictObject({
  ...page,
  name: text(),
  navTitle: text(),
  code: z.string().regex(/^S-\d{2}$/u),
  order: z.number().int(),
  summary: text(80),
  facts: z.array(fact).min(2),
  process: z.array(step).default([]),
  faq: z.array(question).default([]),
  /** Paths of related pages, for example /services/consulting. */
  related: z.array(href).default([]),
})

export const productSchema = z.strictObject({
  ...page,
  name: text(),
  navTitle: text(),
  code: z.string().regex(/^P-\d{2}$/u),
  order: z.number().int(),
  category: text(),
  website: link.optional(),
  summary: text(80),
  facts: z.array(fact).min(2),
  features: z.array(feature).default([]),
  figures: z.array(image).default([]),
  faq: z.array(question).default([]),
  related: z.array(href).default([]),
})

export const jobSchema = z.strictObject({
  ...page,
  order: z.number().int(),
  department: text(),
  location: text(),
  employmentType: text(),
  experience: text(),
  summary: text(40),
  // Search engines only accept a job listing with these three, so the
  // structured job data is left out until all of them are filled in.
  datePosted: date.optional(),
  validThrough: date.optional(),
  applicantCountries: z.array(text()).optional(),
})

export const legalSchema = z.strictObject({
  ...page,
  heading: text(),
  effectiveDate: date,
})

export const homeSchema = z.strictObject({
  ...page,
  hero: z.strictObject({
    eyebrow: text(),
    heading: text(10),
    lead: text(40),
    primary: link,
    secondary: link,
  }),
  products: z.strictObject({ heading: text(), lead: text() }),
  services: z.strictObject({ heading: text(), lead: text() }),
  highlights: z.strictObject({
    heading: text(),
    lead: text(),
    more: link,
    items: z.array(feature).min(1),
  }),
  showcase: z.strictObject({
    label: text(),
    heading: text(),
    text: text(),
    action: link,
    more: link,
  }),
  process: z.strictObject({ heading: text(), lead: text(), more: link }),
  faq: z.strictObject({ heading: text(), lead: text(), more: link }),
  cta: z.strictObject({ heading: text(), text: text(), action: link }),
})

export const hubSchema = z.strictObject({
  ...page,
  heading: text(),
  lead: text(40),
  faq: z.array(question).default([]),
})

export const aboutSchema = z.strictObject({
  ...page,
  heading: text(),
  lead: text(40),
})

export const careersSchema = z.strictObject({
  ...page,
  heading: text(),
  lead: text(40),
  perks: z.array(feature).min(1),
  openings: z.strictObject({ heading: text(), lead: text() }),
  apply: z.strictObject({
    heading: text(),
    lead: text(),
    steps: z.array(step).min(1),
    openApplication: text(),
  }),
})

export const contactSchema = z.strictObject({
  ...page,
  heading: text(),
  lead: text(20),
})

export const pricingSchema = z.strictObject({
  ...page,
  heading: text(),
  lead: text(20),
  prices: z.array(z.strictObject({
    name: text(),
    price: text(),
    about: text(),
    href,
  })).min(1),
})

export const faqSchema = z.strictObject({
  ...page,
  heading: text(),
  lead: text(20),
  groups: z.array(z.strictObject({
    title: text(),
    id: slug,
    items: z.array(question.extend({ home: z.boolean().optional() })).min(1),
  })).min(1),
})

export const glossarySchema = z.strictObject({
  ...page,
  heading: text(),
  lead: text(20),
  terms: z.array(z.strictObject({
    term: text(),
    id: slug,
    aka: z.array(text()).default([]),
    definition: text(40),
    see: link.optional(),
  })).min(1),
})

export type SiteInput = z.infer<typeof siteSchema>
