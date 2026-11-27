import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { parse as parseYaml } from 'yaml'
import type { z } from 'zod'
import { type ImageFile, planImage } from './images'
import { renderInline, renderMarkdown } from './markdown'
import * as schema from './schema'
import type * as T from './types'

/** Paths that exist on the site but are not built from content/. */
const OTHER_ROUTES = ['/payment', '/llms.txt', '/llms-full.txt', '/sitemap.xml', '/robots.txt']

export class ContentError extends Error {
  constructor(public readonly issues: string[]) {
    super(`content/ has ${issues.length} problem${issues.length === 1 ? '' : 's'}:\n${issues.map(issue => `  - ${issue}`).join('\n')}`)
    this.name = 'ContentError'
  }
}

interface Source<Data> {
  file: string
  slug: string
  data: Data
  body: string
}

class Loader {
  readonly issues: string[] = []
  /** Every internal link found, with the file it came from, checked once all routes are known. */
  readonly links: Array<{ file: string, href: string }> = []
  /** Every picture file the pages refer to, for the build to create. */
  readonly imageFiles: ImageFile[] = []

  constructor(readonly rootDir: string) {}

  get contentDir() {
    return join(this.rootDir, 'content')
  }

  name(file: string) {
    return relative(this.rootDir, file)
  }

  async read<S extends z.ZodType>(file: string, shape: S, hasBody = true): Promise<Source<z.output<S>> | undefined> {
    let raw: string
    try {
      raw = await readFile(file, 'utf8')
    } catch {
      this.issues.push(`${this.name(file)}: file is missing`)
      return undefined
    }

    let data: unknown
    let body = ''
    try {
      if (hasBody) {
        const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/u.exec(raw)
        if (!match) {
          this.issues.push(`${this.name(file)}: must start with a block of fields between two --- lines`)
          return undefined
        }
        data = parseYaml(match[1]!)
        body = match[2]!
      } else {
        data = parseYaml(raw)
      }
    } catch (error) {
      this.issues.push(`${this.name(file)}: ${(error as Error).message.split('\n')[0]}`)
      return undefined
    }

    const result = shape.safeParse(data)
    if (!result.success) {
      for (const issue of result.error.issues) {
        this.issues.push(`${this.name(file)}: ${issue.path.join('.') || '(top level)'}: ${issue.message}`)
      }
      return undefined
    }

    const slug = file.split('/').pop()!.replace(/\.(md|yaml)$/u, '')
    return { file, slug, data: result.data, body }
  }

  async readAll<S extends z.ZodType>(directory: string, shape: S): Promise<Array<Source<z.output<S>>>> {
    const folder = join(this.contentDir, directory)
    let names: string[]
    try {
      names = (await readdir(folder)).filter(name => name.endsWith('.md')).sort()
    } catch {
      this.issues.push(`content/${directory}: folder is missing`)
      return []
    }

    const sources = await Promise.all(names.map(name => this.read(join(folder, name), shape)))
    return sources.filter(source => source !== undefined)
  }

  track(file: string, href: string) {
    if (href.startsWith('/')) {
      this.links.push({ file, href })
    }
    return href
  }

  private trackHtml(file: string, html: string) {
    for (const match of html.matchAll(/href="([^"]+)"/gu)) {
      this.track(file, match[1]!)
    }
  }

  rich(file: string, source: string): T.Rich {
    const { html, text } = renderInline(source)
    this.trackHtml(file, html)
    return { html, text }
  }

  body(file: string, source: string): T.Body {
    const rendered = renderMarkdown(source)
    this.trackHtml(file, rendered.html)
    if (rendered.headings.some(heading => heading.depth === 1)) {
      this.issues.push(`${this.name(file)}: the text must not contain a top-level "# " heading; the page heading comes from the fields above it`)
    }
    if (/<img\b/u.test(rendered.html)) {
      this.issues.push(`${this.name(file)}: the text contains a picture, which would be published unresized; pictures go in the \`figures\` list of a product page`)
    }
    return rendered
  }

  link(file: string, link: T.Link): T.Link {
    this.track(file, link.href)
    return link
  }

  questions(file: string, items: Array<{ q: string, a: string, structured?: boolean }>): T.Question[] {
    return items.map(item => ({
      q: item.q,
      a: this.rich(file, item.a),
      ...(item.structured === false ? { structured: false } : {}),
    }))
  }

  features(file: string, items: Array<{ title: string, text: string }>): T.Feature[] {
    return items.map(item => ({ title: item.title, text: this.rich(file, item.text) }))
  }

  facts(file: string, items: Array<{ label: string, value: string }>): T.Fact[] {
    return items.map(item => ({ label: item.label, value: this.rich(file, item.value) }))
  }

  async image(file: string, input: { src: string, alt: string, caption?: string }): Promise<T.ContentImage> {
    try {
      const { files, ...prepared } = await planImage(join(this.contentDir, 'images'), input.src)
      this.imageFiles.push(...files)
      return { ...input, ...prepared }
    } catch (error) {
      const reason = (error as NodeJS.ErrnoException).code === 'ENOENT' ? 'was not found' : (error as Error).message
      this.issues.push(`${this.name(file)}: image content/images/${input.src} ${reason}`)
      return { ...input, width: 0, height: 0, sources: [] }
    }
  }

  checkLinks(routes: T.RouteInfo[]) {
    const known = new Set([...routes.map(route => route.path), ...OTHER_ROUTES])

    for (const { file, href } of this.links) {
      const path = href.split(/[?#]/u)[0]!
      if (!known.has(path) && !path.startsWith('/payment/')) {
        this.issues.push(`${this.name(file)}: link to ${href} does not match any page`)
      }
    }
  }
}

function meta(source: Source<{ title: string, description: string, updatedAt: string }>, path: string): T.PageMeta {
  return {
    path,
    title: source.data.title,
    description: source.data.description.replace(/\s+/gu, ' '),
    updatedAt: source.data.updatedAt,
  }
}

function byOrder<Item extends { order: number }>(items: Item[]) {
  return [...items].sort((a, b) => a.order - b.order)
}

export async function loadContent(rootDir: string): Promise<T.ContentData> {
  return (await loadContentAndImages(rootDir)).data
}

/** The content, plus the list of picture files its pages refer to. */
export async function loadContentAndImages(rootDir: string): Promise<{ data: T.ContentData, imageFiles: ImageFile[] }> {
  const loader = new Loader(rootDir)
  const pages = join(loader.contentDir, 'pages')

  const [site, home, servicesHub, productsHub, about, careers, contact, pricing, faq, glossary, services, products, jobs, legal] = await Promise.all([
    loader.read(join(loader.contentDir, 'site.yaml'), schema.siteSchema, false),
    loader.read(join(pages, 'home.md'), schema.homeSchema),
    loader.read(join(pages, 'services.md'), schema.hubSchema),
    loader.read(join(pages, 'products.md'), schema.hubSchema),
    loader.read(join(pages, 'about-us.md'), schema.aboutSchema),
    loader.read(join(pages, 'careers.md'), schema.careersSchema),
    loader.read(join(pages, 'contact-us.md'), schema.contactSchema),
    loader.read(join(pages, 'pricing.md'), schema.pricingSchema),
    loader.read(join(pages, 'faq.md'), schema.faqSchema),
    loader.read(join(pages, 'glossary.md'), schema.glossarySchema),
    loader.readAll('services', schema.serviceSchema),
    loader.readAll('products', schema.productSchema),
    loader.readAll('careers', schema.jobSchema),
    loader.readAll('legal', schema.legalSchema),
  ])

  if (!site || !home || !servicesHub || !productsHub || !about || !careers || !contact || !pricing || !faq || !glossary) {
    throw new ContentError(loader.issues)
  }

  for (const item of site.data.navigation) {
    loader.track(site.file, item.href)
  }

  const hub = (source: NonNullable<typeof servicesHub>, path: string): T.Hub => ({
    ...meta(source, path),
    heading: source.data.heading,
    lead: loader.rich(source.file, source.data.lead),
    faq: loader.questions(source.file, source.data.faq),
    body: loader.body(source.file, source.body),
  })

  const data: T.ContentData = {
    site: site.data,
    footer: { services: [], products: [], company: [], legal: [] },

    home: {
      ...meta(home, '/'),
      hero: {
        eyebrow: home.data.hero.eyebrow,
        heading: home.data.hero.heading,
        lead: loader.rich(home.file, home.data.hero.lead),
        primary: loader.link(home.file, home.data.hero.primary),
        secondary: loader.link(home.file, home.data.hero.secondary),
      },
      products: { heading: home.data.products.heading, lead: loader.rich(home.file, home.data.products.lead) },
      services: { heading: home.data.services.heading, lead: loader.rich(home.file, home.data.services.lead) },
      highlights: {
        heading: home.data.highlights.heading,
        lead: loader.rich(home.file, home.data.highlights.lead),
        more: loader.link(home.file, home.data.highlights.more),
        items: loader.features(home.file, home.data.highlights.items),
      },
      showcase: {
        label: home.data.showcase.label,
        heading: home.data.showcase.heading,
        text: loader.rich(home.file, home.data.showcase.text),
        action: loader.link(home.file, home.data.showcase.action),
        more: loader.link(home.file, home.data.showcase.more),
      },
      process: {
        heading: home.data.process.heading,
        lead: loader.rich(home.file, home.data.process.lead),
        more: loader.link(home.file, home.data.process.more),
      },
      faq: {
        heading: home.data.faq.heading,
        lead: loader.rich(home.file, home.data.faq.lead),
        more: loader.link(home.file, home.data.faq.more),
      },
      cta: {
        heading: home.data.cta.heading,
        text: loader.rich(home.file, home.data.cta.text),
        action: loader.link(home.file, home.data.cta.action),
      },
    },

    servicesHub: hub(servicesHub, '/services'),
    productsHub: hub(productsHub, '/products'),

    about: {
      ...meta(about, '/about-us'),
      heading: about.data.heading,
      lead: loader.rich(about.file, about.data.lead),
      body: loader.body(about.file, about.body),
    },

    careers: {
      ...meta(careers, '/careers'),
      heading: careers.data.heading,
      lead: loader.rich(careers.file, careers.data.lead),
      perks: loader.features(careers.file, careers.data.perks),
      openings: { heading: careers.data.openings.heading, lead: loader.rich(careers.file, careers.data.openings.lead) },
      apply: {
        heading: careers.data.apply.heading,
        lead: loader.rich(careers.file, careers.data.apply.lead),
        steps: careers.data.apply.steps.map(item => ({ title: item.title, text: loader.rich(careers.file, item.text) })),
        openApplication: loader.rich(careers.file, careers.data.apply.openApplication),
      },
    },

    contact: {
      ...meta(contact, '/contact-us'),
      heading: contact.data.heading,
      lead: loader.rich(contact.file, contact.data.lead),
    },

    pricing: {
      ...meta(pricing, '/pricing'),
      heading: pricing.data.heading,
      lead: loader.rich(pricing.file, pricing.data.lead),
      prices: pricing.data.prices.map(price => ({
        name: price.name,
        price: price.price,
        about: loader.rich(pricing.file, price.about),
        href: loader.track(pricing.file, price.href),
      })),
      body: loader.body(pricing.file, pricing.body),
    },

    faq: {
      ...meta(faq, '/faq'),
      heading: faq.data.heading,
      lead: loader.rich(faq.file, faq.data.lead),
      groups: faq.data.groups.map(group => ({
        title: group.title,
        id: group.id,
        items: group.items.map(item => ({
          q: item.q,
          a: loader.rich(faq.file, item.a),
          ...(item.structured === false ? { structured: false } : {}),
          ...(item.home ? { home: true } : {}),
        })),
      })),
    },

    glossary: {
      ...meta(glossary, '/glossary'),
      heading: glossary.data.heading,
      lead: loader.rich(glossary.file, glossary.data.lead),
      terms: glossary.data.terms
        .map(term => ({
          term: term.term,
          id: term.id,
          aka: term.aka,
          definition: loader.rich(glossary.file, term.definition),
          ...(term.see ? { see: loader.link(glossary.file, term.see) } : {}),
        }))
        .sort((a, b) => a.term.localeCompare(b.term, 'en', { sensitivity: 'base' })),
    },

    services: byOrder(services.map(source => ({
      ...meta(source, `/services/${source.slug}`),
      slug: source.slug,
      name: source.data.name,
      navTitle: source.data.navTitle,
      code: source.data.code,
      order: source.data.order,
      summary: loader.rich(source.file, source.data.summary),
      facts: loader.facts(source.file, source.data.facts),
      process: source.data.process.map(item => ({ title: item.title, text: loader.rich(source.file, item.text) })),
      faq: loader.questions(source.file, source.data.faq),
      related: source.data.related.map(path => loader.track(source.file, path)),
      body: loader.body(source.file, source.body),
    }))),

    products: byOrder(await Promise.all(products.map(async source => ({
      ...meta(source, `/products/${source.slug}`),
      slug: source.slug,
      name: source.data.name,
      navTitle: source.data.navTitle,
      code: source.data.code,
      order: source.data.order,
      category: source.data.category,
      ...(source.data.website ? { website: source.data.website } : {}),
      summary: loader.rich(source.file, source.data.summary),
      facts: loader.facts(source.file, source.data.facts),
      features: loader.features(source.file, source.data.features),
      figures: await Promise.all(source.data.figures.map(figure => loader.image(source.file, figure))),
      faq: loader.questions(source.file, source.data.faq),
      related: source.data.related.map(path => loader.track(source.file, path)),
      body: loader.body(source.file, source.body),
    })))),

    jobs: byOrder(jobs.map(source => ({
      ...meta(source, `/careers/${source.slug}`),
      slug: source.slug,
      order: source.data.order,
      department: source.data.department,
      location: source.data.location,
      employmentType: source.data.employmentType,
      experience: source.data.experience,
      summary: loader.rich(source.file, source.data.summary),
      ...(source.data.datePosted ? { datePosted: source.data.datePosted } : {}),
      ...(source.data.validThrough ? { validThrough: source.data.validThrough } : {}),
      ...(source.data.applicantCountries ? { applicantCountries: source.data.applicantCountries } : {}),
      body: loader.body(source.file, source.body),
    }))),

    legal: legal.map(source => ({
      ...meta(source, `/${source.slug}`),
      slug: source.slug,
      heading: source.data.heading,
      effectiveDate: source.data.effectiveDate,
      body: loader.body(source.file, source.body),
    })),

    routes: [],
  }

  const route = (page: T.PageMeta, section: T.RouteInfo['section'], summary: string): T.RouteInfo => ({
    path: page.path,
    title: page.title,
    description: page.description,
    updatedAt: page.updatedAt,
    section,
    summary,
  })

  data.routes = [
    route(data.home, 'home', data.home.hero.lead.text),
    route(data.servicesHub, 'services', data.servicesHub.lead.text),
    ...data.services.map(item => route(item, 'services', item.summary.text)),
    route(data.productsHub, 'products', data.productsHub.lead.text),
    ...data.products.map(item => route(item, 'products', item.summary.text)),
    route(data.about, 'company', data.about.lead.text),
    route(data.pricing, 'company', data.pricing.lead.text),
    route(data.faq, 'company', data.faq.lead.text),
    route(data.glossary, 'company', data.glossary.lead.text),
    route(data.contact, 'company', data.contact.lead.text),
    route(data.careers, 'careers', data.careers.lead.text),
    ...data.jobs.map(item => route(item, 'careers', item.summary.text)),
    ...data.legal.map(item => route(item, 'legal', item.description)),
  ]

  data.footer = {
    services: data.services.map(item => ({ label: item.navTitle, href: item.path })),
    products: data.products.map(item => ({ label: item.navTitle, href: item.path })),
    company: [
      { label: 'About', href: data.about.path },
      { label: 'Careers', href: data.careers.path },
      { label: 'Pricing', href: data.pricing.path },
      { label: 'Questions', href: data.faq.path },
      { label: 'Glossary', href: data.glossary.path },
      { label: 'Contact', href: data.contact.path },
    ],
    legal: data.legal.map(item => ({ label: item.title, href: item.path })),
  }

  const paths = data.routes.map(item => item.path)
  for (const path of paths.filter((item, index) => paths.indexOf(item) !== index)) {
    loader.issues.push(`two files produce the page ${path}`)
  }

  loader.checkLinks(data.routes)

  if (loader.issues.length) {
    throw new ContentError(loader.issues)
  }

  return { data, imageFiles: loader.imageFiles }
}
