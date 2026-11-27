import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { loadContent } from '../../modules/content/load'
import { renderInline, renderMarkdown } from '../../modules/content/markdown'
import { jobSchema, productSchema, serviceSchema, siteSchema } from '../../modules/content/schema'

const root = fileURLToPath(new URL('../../', import.meta.url))

const service = {
  title: 'Software development services',
  description: 'Custom web, mobile and backend development from YBX Labs, hourly, per project or long term.',
  updatedAt: '2026-11-27',
  name: 'Software development',
  navTitle: 'Development',
  code: 'S-01',
  order: 1,
  summary: 'YBX Labs builds custom software and can work as part of your development team from idea to launch.',
  facts: [{ label: 'Scope', value: 'Planning to support' }, { label: 'Ownership', value: 'You own your code' }],
}

const issues = (result: { success: boolean, error?: { issues: Array<{ path: PropertyKey[], message: string }> } }) =>
  result.success ? [] : result.error!.issues.map(issue => issue.path.join('.'))

describe('content schema', () => {
  it('accepts a complete service', () => {
    expect(serviceSchema.safeParse(service).success).toBe(true)
  })

  it.each(['title', 'description', 'updatedAt', 'summary'] as const)('fails without %s', (field) => {
    const { [field]: _removed, ...rest } = service

    expect(issues(serviceSchema.safeParse(rest))).toContain(field)
  })

  it.each(['27 November 2026', '2026-13-01', '2026-02-31', '2026-1-5'])('fails on the date %s', (updatedAt) => {
    expect(issues(serviceSchema.safeParse({ ...service, updatedAt }))).toContain('updatedAt')
  })

  it('fails on a field that is misspelled', () => {
    expect(serviceSchema.safeParse({ ...service, sumary: 'typo' }).success).toBe(false)
  })

  it('fails when an image has no description', () => {
    const product = {
      ...service,
      code: 'P-01',
      category: 'AI workspace',
      figures: [{ src: 'products/flavorgpt/chat.png' }],
    }

    expect(issues(productSchema.safeParse(product))).toContain('figures.0.alt')
    expect(productSchema.safeParse({ ...product, figures: [{ src: 'products/flavorgpt/chat.png', alt: 'The FlavorGPT chat workspace.' }] }).success).toBe(true)
  })

  it.each([
    'https://example.com/a.png',
    '/images/products/flavorgpt/chat.png',
    '../../secrets/key.png',
    'products/flavorgpt/chat&settings.png',
    'products/flavorgpt/chat settings.png',
    'products/flavorgpt/chat.v2.png',
    'products/flavorgpt/chat.gif',
  ])('fails on the image path %s', (src) => {
    const product = { ...service, code: 'P-01', category: 'AI workspace', figures: [{ src, alt: 'A picture that should be refused.' }] }

    expect(issues(productSchema.safeParse(product))).toContain('figures.0.src')
  })

  it('keeps job dates optional but checks their format', () => {
    const job = {
      title: 'AI/ML Engineer',
      description: 'AI/ML Engineer at YBX Labs: a remote, full-time role building LLM applications.',
      updatedAt: '2026-04-26',
      order: 1,
      department: 'AI & Research',
      location: 'Remote',
      employmentType: 'Full-time',
      experience: '2-5 years',
      summary: 'Join our AI team to build, fine-tune, and deploy large language models.',
    }

    expect(jobSchema.safeParse(job).success).toBe(true)
    expect(issues(jobSchema.safeParse({ ...job, datePosted: 'last week' }))).toContain('datePosted')
  })

  it('checks the company facts', () => {
    expect(issues(siteSchema.safeParse({}))).toEqual(expect.arrayContaining(['name', 'registration', 'address', 'contact']))
  })
})

describe('markdown', () => {
  it('renders headings with ids and lists them', () => {
    const { html, headings } = renderMarkdown('## What we offer\n\nText.\n\n### Custom development\n')

    expect(html).toContain('<h2 id="what-we-offer">What we offer</h2>')
    expect(headings).toEqual([
      { depth: 2, id: 'what-we-offer', text: 'What we offer' },
      { depth: 3, id: 'custom-development', text: 'Custom development' },
    ])
  })

  it('returns the text without markup', () => {
    expect(renderMarkdown('See the **[pricing page](/pricing)** for details.').text).toBe('See the pricing page for details.')
  })

  it('renders tables', () => {
    expect(renderMarkdown('| A | B |\n| --- | --- |\n| 1 | 2 |').html).toContain('<table')
  })

  it('does not pass raw HTML through', () => {
    expect(renderMarkdown('Hello <script>alert(1)</script>').html).not.toContain('<script>')
  })

  it('marks links that leave the site', () => {
    const { html } = renderMarkdown('[Site](https://flavor-ai.tech/) and [page](/pricing)')

    expect(html).toContain('<a href="https://flavor-ai.tech/" rel="noopener">Site</a>')
    expect(html).toContain('<a href="/pricing">page</a>')
  })

  it('drops the paragraph wrapper for a single-line field', () => {
    expect(renderInline('See the [pricing page](/pricing)').html).toBe('See the <a href="/pricing">pricing page</a>')
  })
})

describe('the content in this repository', () => {
  it('loads without problems', async () => {
    const data = await loadContent(root)

    expect(data.routes.length).toBeGreaterThanOrEqual(27)
    expect(new Set(data.routes.map(route => route.path)).size).toBe(data.routes.length)
    expect(data.services).toHaveLength(6)
    expect(data.products.map(product => product.slug)).toEqual(['flavorgpt', 'flavorai', 'flavorai-api'])
  })

  it('gives every page a title, a description, a date and a summary', async () => {
    const data = await loadContent(root)

    for (const route of data.routes) {
      expect(route.title.length, route.path).toBeGreaterThan(2)
      expect(route.description.length, route.path).toBeGreaterThanOrEqual(50)
      expect(route.updatedAt, route.path).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(route.summary.length, route.path).toBeGreaterThan(20)
    }
  })

  it('gives every image its size and a description', async () => {
    const data = await loadContent(root)
    const figures = data.products.flatMap(product => product.figures)

    expect(figures.length).toBeGreaterThan(0)
    for (const figure of figures) {
      expect(figure.width, figure.src).toBeGreaterThan(0)
      expect(figure.height, figure.src).toBeGreaterThan(0)
      expect(figure.alt.length, figure.src).toBeGreaterThanOrEqual(10)
      expect(figure.src, figure.src).toMatch(/^\/img\/[\w/-]+-\d+\.[a-f0-9]{10}\.png$/)
      expect(figure.sources.map(source => source.type), figure.src).toEqual(['image/avif', 'image/webp'])
    }
  })

  it('keeps the published prices unchanged', async () => {
    const data = await loadContent(root)

    expect(data.pricing.prices.map(price => [price.name, price.price])).toEqual([
      ['Development services', '18,000 INR'],
      ['AI asset management', '*10,000 INR'],
      ['AI services & tools', '20,000 INR'],
    ])
  })
})
