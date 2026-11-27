#!/usr/bin/env node
// Checks the built site, page by page, before it is deployed.
//
//   npm run build:cloudflare && npm run check:site
//   node scripts/check-site.mjs path/to/public    check another output folder
//
// It reads .output/public and fails if any page is missing what search engines
// and AI crawlers rely on: one heading, a title, a description, a canonical
// address, share tags, valid structured data, image descriptions and sizes,
// working internal links and a Markdown copy. It also checks that content
// pages ship no scripts, and that the sitemap, robots.txt and llms.txt agree
// with the pages that were built.

import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = process.argv[2] ? join(process.cwd(), process.argv[2]) : join(root, '.output/public')

// Routes that are prebuilt but are allowed to run scripts.
const SCRIPTED = new Set(['/contact-us'])
// Paths answered by the server at request time, so they have no file.
const SERVER_ROUTES = [/^\/payment(\/|$)/, /^\/api\//, /^\/pay$/]
// The Apple Pay domain file must reach the browser byte for byte.
const APPLE_PAY_FILE = '.well-known/apple-developer-merchantid-domain-association'
const APPLE_PAY_SHA256 = 'd9a1dbf6d278f12d71f1967ecf0f8cf3fe042d82b5b47ef028542397ca447906'

if (!existsSync(out)) {
  console.error('No build found. Run `npm run build:cloudflare` first.')
  process.exit(1)
}

const problems = []
const notes = []
const problem = (where, message) => problems.push(`${where}: ${message}`)

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? walk(path) : [path]
  })
}

const files = walk(out)
const fileSet = new Set(files.map(file => `/${relative(out, file)}`))
const read = path => readFileSync(join(out, path), 'utf8')
const decode = value => value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, '\'').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
const attribute = (tag, name) => {
  const match = new RegExp(`\\s${name}="([^"]*)"`, 'i').exec(tag)
  return match ? decode(match[1]) : undefined
}

const pages = files
  .filter(file => file.endsWith('.html'))
  .map((file) => {
    const path = `/${relative(out, file)}`
    const route = path === '/index.html' ? '/' : path.replace(/\.html$/, '')
    return { route, html: readFileSync(file, 'utf8') }
  })
  .sort((a, b) => a.route.localeCompare(b.route))

const routes = new Set(pages.map(page => page.route))

const robots = fileSet.has('/robots.txt') ? read('/robots.txt') : ''
const staging = /^User-agent: \*\s*\nDisallow: \/\s*$/m.test(robots)
const origin = /<link rel="canonical" href="(https?:\/\/[^/"]+)/.exec(pages.find(page => page.route === '/')?.html ?? '')?.[1]

if (!origin) {
  problem('/', 'no canonical address found, so the site origin is unknown')
}

function meta(html, key, value) {
  const tag = new RegExp(`<meta[^>]*\\s${key}="${value}"[^>]*>`, 'i').exec(html)?.[0]
  return tag ? attribute(tag, 'content') : undefined
}

function resolvesToSomething(path) {
  return routes.has(path) || fileSet.has(path) || SERVER_ROUTES.some(pattern => pattern.test(path))
}

const ids = new Map(pages.map(page => [page.route, new Set([...page.html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]))]))

for (const { route, html } of pages) {
  const expected = `${origin}${route}`

  if (!/<html[^>]*\slang="en"/.test(html)) problem(route, 'the <html> tag has no lang="en"')

  const title = decode(/<title>([^<]*)<\/title>/.exec(html)?.[1] ?? '')
  if (!title) problem(route, 'no <title>')
  else if (title.length > 70) notes.push(`${route}: title is ${title.length} characters; search results cut titles at about 60`)

  const description = meta(html, 'name', 'description')
  if (!description) problem(route, 'no meta description')
  else if (description.length < 50) problem(route, `meta description is only ${description.length} characters`)
  else if (description.length > 165) notes.push(`${route}: description is ${description.length} characters; search results show about 160`)

  const canonical = attribute(/<link[^>]*rel="canonical"[^>]*>/.exec(html)?.[0] ?? '', 'href')
  if (canonical !== expected) problem(route, `canonical is ${canonical ?? 'missing'}, expected ${expected}`)

  const robotsMeta = meta(html, 'name', 'robots') ?? ''
  if (!staging && /noindex/.test(robotsMeta)) problem(route, 'is marked noindex in a production build')
  if (staging && !/noindex/.test(robotsMeta)) problem(route, 'is not marked noindex in a staging build')

  for (const property of ['og:title', 'og:description', 'og:site_name', 'og:type', 'og:image:width', 'og:image:height']) {
    if (!meta(html, 'property', property)) problem(route, `no ${property}`)
  }
  if (meta(html, 'property', 'og:url') !== expected) problem(route, 'og:url does not match the canonical address')
  if (meta(html, 'name', 'twitter:card') !== 'summary_large_image') problem(route, 'no large twitter:card')

  const shareImage = meta(html, 'property', 'og:image')
  if (!shareImage?.startsWith(`${origin}/`)) problem(route, 'og:image is missing or not a full address')
  else if (!fileSet.has(shareImage.slice(origin.length))) problem(route, `og:image ${shareImage} was not built`)

  if (!meta(html, 'property', 'article:modified_time')) problem(route, 'no last-modified date')

  const headings = html.match(/<h1[\s>]/g)?.length ?? 0
  if (headings !== 1) problem(route, `has ${headings} <h1> headings, expected exactly 1`)

  // Structured data
  const blocks = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
  if (!blocks.length) problem(route, 'no structured data')
  const types = new Set()
  for (const [, json] of blocks) {
    try {
      const nodes = JSON.parse(json)['@graph'] ?? []
      for (const node of nodes) {
        for (const type of [].concat(node['@type'])) types.add(type)
        for (const key of ['@id', 'url']) {
          if (typeof node[key] === 'string' && !/^https?:\/\//.test(node[key])) {
            problem(route, `structured data ${[].concat(node['@type']).join('+')} has a relative ${key}: ${node[key]}`)
          }
        }
      }
    } catch (error) {
      problem(route, `structured data is not valid JSON: ${error.message}`)
    }
  }
  for (const type of ['Organization', 'WebSite', 'WebPage', ...(route === '/' ? [] : ['BreadcrumbList'])]) {
    if (!types.has(type)) problem(route, `structured data has no ${type}`)
  }

  // Images
  for (const [tag] of html.matchAll(/<img\b[^>]*>/g)) {
    const source = attribute(tag, 'src') ?? '(no src)'
    if (!attribute(tag, 'alt')) problem(route, `image ${source} has no description (alt)`)
    if (!attribute(tag, 'width') || !attribute(tag, 'height')) problem(route, `image ${source} has no width and height`)
    for (const candidate of [source, ...(attribute(tag, 'srcset') ?? '').split(',').map(item => item.trim().split(/\s+/)[0])]) {
      if (candidate?.startsWith('/') && !fileSet.has(candidate)) problem(route, `image file ${candidate} was not built`)
    }
  }
  for (const [tag] of html.matchAll(/<source\b[^>]*>/g)) {
    for (const candidate of (attribute(tag, 'srcset') ?? '').split(',').map(item => item.trim().split(/\s+/)[0])) {
      if (candidate?.startsWith('/') && !fileSet.has(candidate)) problem(route, `image file ${candidate} was not built`)
    }
  }

  // Scripts: content pages are HTML and CSS only.
  const scripts = [...html.matchAll(/<script\b[^>]*>/g)].map(match => match[0])
  const executable = scripts.filter(tag => !/type="(speculationrules|application\/ld\+json)"/.test(tag))
  if (!SCRIPTED.has(route) && executable.length) {
    problem(route, `ships ${executable.length} script tag(s) but should ship none: ${executable[0]}`)
  }
  if (SCRIPTED.has(route) && !executable.length) problem(route, 'should ship its scripts but has none')
  if (!SCRIPTED.has(route) && /<link[^>]*rel="(modulepreload|preload)"[^>]*as="script"/.test(html)) {
    problem(route, 'preloads a script it does not use')
  }

  // Links
  for (const [, raw] of html.matchAll(/<a\b[^>]*\shref="([^"]*)"/g)) {
    const href = decode(raw)
    if (href.startsWith('#')) {
      if (href.length > 1 && !ids.get(route).has(href.slice(1))) problem(route, `links to ${href}, which is not on the page`)
      continue
    }
    if (!href.startsWith('/')) continue

    const [path, fragment] = href.split('#')
    const clean = path.split('?')[0]
    if (clean !== '/' && clean.endsWith('/')) problem(route, `links to ${href} with a trailing slash`)
    if (!resolvesToSomething(clean)) problem(route, `links to ${href}, which does not exist`)
    else if (fragment && ids.has(clean) && !ids.get(clean).has(fragment)) problem(route, `links to ${href}, but that page has no "${fragment}"`)
  }

  // Markdown copy
  const markdown = route === '/' ? '/index.md' : `${route}.md`
  if (!fileSet.has(markdown)) problem(route, `has no Markdown copy at ${markdown}`)
  if (!new RegExp(`<link[^>]*rel="alternate"[^>]*type="text/markdown"[^>]*href="${markdown.replace(/[.]/g, '\\.')}"`).test(html)) {
    problem(route, 'does not link to its Markdown copy')
  }
}

// Sitemap
if (!fileSet.has('/sitemap.xml')) {
  problem('sitemap.xml', 'was not built')
} else if (!staging) {
  const entries = [...read('/sitemap.xml').matchAll(/<url>([\s\S]*?)<\/url>/g)].map(([, entry]) => ({
    loc: /<loc>([^<]+)<\/loc>/.exec(entry)?.[1],
    lastmod: /<lastmod>([^<]+)<\/lastmod>/.exec(entry)?.[1],
  }))
  const listed = new Set(entries.map(entry => entry.loc))
  for (const route of routes) {
    if (!listed.has(`${origin}${route}`)) problem('sitemap.xml', `does not list ${route}`)
  }
  for (const entry of entries) {
    const path = entry.loc?.slice(origin.length)
    if (!routes.has(path)) problem('sitemap.xml', `lists ${entry.loc}, which is not a built page`)
    if (!/^\d{4}-\d{2}-\d{2}/.test(entry.lastmod ?? '')) problem('sitemap.xml', `${entry.loc} has no lastmod date`)
  }
}

// robots.txt
if (!robots) problem('robots.txt', 'was not built')
else if (!staging) {
  if (!robots.includes(`Sitemap: ${origin}/sitemap.xml`)) problem('robots.txt', 'does not point to the sitemap')
  if (!/Content-Signal:/.test(robots)) problem('robots.txt', 'has no Content-Signal line')
}

// llms.txt
for (const file of ['/llms.txt', '/llms-full.txt']) {
  if (!fileSet.has(file)) problem(file, 'was not built')
}
if (fileSet.has('/llms.txt')) {
  const llms = read('/llms.txt')
  for (const route of routes) {
    const markdown = `${origin}${route === '/' ? '/index' : route}.md`
    if (!llms.includes(markdown)) problem('llms.txt', `does not list ${markdown}`)
  }
  if (/&amp;|&#/.test(llms)) problem('llms.txt', 'contains HTML entities')
}

// Files that must be present and unchanged
if (!fileSet.has(`/${APPLE_PAY_FILE}`)) problem(APPLE_PAY_FILE, 'is missing')
else if (createHash('sha256').update(readFileSync(join(out, APPLE_PAY_FILE))).digest('hex') !== APPLE_PAY_SHA256) {
  problem(APPLE_PAY_FILE, 'has changed; Apple Pay needs it byte for byte')
}
if (!fileSet.has('/indexnow-key.txt') || !/^[a-f0-9]{32}$/.test(read('/indexnow-key.txt').trim())) {
  problem('indexnow-key.txt', 'is missing or is not a 32-character key')
}
for (const file of ['/favicon.ico', '/icon.svg', '/apple-touch-icon.png', '/logo.png']) {
  if (!fileSet.has(file)) problem(file, 'is missing')
}

// Cloudflare limits for static assets
const headerRules = fileSet.has('/_headers') ? read('/_headers').split('\n').filter(line => /^\/|^https?:/.test(line)).length : 0
if (headerRules > 100) problem('_headers', `has ${headerRules} rules; Cloudflare allows 100`)
if (files.length > 20000) problem('assets', `${files.length} files; Cloudflare allows 20,000`)
for (const file of files) {
  if (statSync(file).size > 25 * 1024 * 1024) problem(relative(out, file), 'is larger than 25 MiB, the Cloudflare limit for one file')
}

console.log(`Checked ${pages.length} pages, ${files.length} files, ${headerRules} header rules (${staging ? 'staging' : 'production'} build for ${origin}).`)
for (const note of notes) console.log(`  note: ${note}`)

if (problems.length) {
  console.error(`\n${problems.length} problem${problems.length === 1 ? '' : 's'}:`)
  for (const item of problems) console.error(`  - ${item}`)
  process.exit(1)
}
console.log('No problems found.')
