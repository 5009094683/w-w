#!/usr/bin/env node
// One-off export of the content that used to live in the Prismic repository
// "ybxlabs-web". It only reads the public Prismic API; the repository itself
// is not changed.
//
//   node scripts/export-prismic.mjs            write a readable dump to .prismic-export/
//   node scripts/export-prismic.mjs --legal    also rewrite content/legal/*.md, word for word
//   node scripts/export-prismic.mjs --images   also download every image to .prismic-export/images/
//
// The legal pages are converted mechanically so their wording stays exactly as
// published. The other pages were rewritten by hand from the dump.

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPOSITORY = 'ybxlabs-web'
const API = `https://${REPOSITORY}.cdn.prismic.io/api/v2`
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, '.prismic-export')
const flags = new Set(process.argv.slice(2))

const LEGAL_PAGES = {
  'privacy-policy': 'Privacy Policy',
  'terms-conditions': 'Terms & Conditions',
  'refund-policy': 'Refund Policy',
}

async function getJson(url) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${url}`)
  }
  return response.json()
}

async function fetchDocuments() {
  const api = await getJson(API)
  const ref = api.refs.find(item => item.isMasterRef)?.ref
  if (!ref) {
    throw new Error('Prismic master ref not found')
  }

  const documents = []
  let page = 1
  for (;;) {
    const data = await getJson(`${API}/documents/search?ref=${encodeURIComponent(ref)}&pageSize=100&page=${page}&lang=*`)
    documents.push(...data.results)
    if (page >= data.total_pages) {
      break
    }
    page += 1
  }
  return documents
}

function isRichText(value) {
  return Array.isArray(value) && value.length > 0 && value.every(block => block && typeof block.type === 'string' && ('text' in block || block.type === 'image' || block.type === 'embed'))
}

// Applies Prismic spans (bold, italic, links) to a block's text.
function inlineMarkdown(text, spans = []) {
  if (!spans.length) {
    return text
  }

  const opens = new Map()
  const closes = new Map()
  const push = (map, index, value) => map.set(index, [...(map.get(index) ?? []), value])

  for (const span of spans) {
    if (span.type === 'strong') {
      push(opens, span.start, '**')
      push(closes, span.end, '**')
    } else if (span.type === 'em') {
      push(opens, span.start, '_')
      push(closes, span.end, '_')
    } else if (span.type === 'hyperlink') {
      push(opens, span.start, '[')
      push(closes, span.end, `](${linkUrl(span.data)})`)
    }
  }

  let output = ''
  for (let index = 0; index <= text.length; index += 1) {
    output += (closes.get(index) ?? []).reverse().join('')
    output += (opens.get(index) ?? []).join('')
    output += text[index] ?? ''
  }
  return output
}

function linkUrl(link) {
  if (!link) {
    return ''
  }
  if (link.link_type === 'Document') {
    if (link.type === 'case_study') return `/services/${link.uid}`
    if (link.uid === 'home' || link.type === 'home') return '/'
    return `/${link.uid ?? ''}`
  }
  return link.url ?? ''
}

function richTextToMarkdown(blocks) {
  const lines = []
  let previousType = ''

  for (const block of blocks) {
    const text = inlineMarkdown((block.text ?? '').replace(/\s+$/u, ''), block.spans)
    const isListItem = block.type === 'list-item' || block.type === 'o-list-item'

    if (lines.length && !(isListItem && previousType === block.type)) {
      lines.push('')
    }

    const heading = /^heading([1-6])$/.exec(block.type)
    if (heading) {
      lines.push(`${'#'.repeat(Number(heading[1]))} ${text}`)
    } else if (block.type === 'list-item') {
      lines.push(`- ${text}`)
    } else if (block.type === 'o-list-item') {
      lines.push(`1. ${text}`)
    } else if (block.type === 'image') {
      lines.push(`![${block.alt ?? ''}](${block.url})`)
    } else if (block.type === 'preformatted') {
      lines.push('```', block.text ?? '', '```')
    } else {
      lines.push(text)
    }
    previousType = block.type
  }

  return `${lines.join('\n').trim()}\n`
}

function collectImages(value, found = new Map()) {
  if (!value || typeof value !== 'object') {
    return found
  }
  if (typeof value.url === 'string' && value.dimensions && /images\.prismic\.io|prismic-io\.s3/u.test(value.url)) {
    const url = value.url.split('?')[0]
    found.set(url, { url, alt: value.alt ?? null, width: value.dimensions.width, height: value.dimensions.height })
  }
  for (const child of Array.isArray(value) ? value : Object.values(value)) {
    collectImages(child, found)
  }
  return found
}

// A readable dump of any Prismic value, used as source material for the rewrite.
function dumpValue(value, indent = '') {
  if (value == null || value === '') {
    return `${indent}(empty)\n`
  }
  if (isRichText(value)) {
    return richTextToMarkdown(value).split('\n').map(line => `${indent}${line}`).join('\n') + '\n'
  }
  if (Array.isArray(value)) {
    return value.map((item, index) => `${indent}[${index}]\n${dumpValue(item, `${indent}  `)}`).join('')
  }
  if (typeof value === 'object') {
    if (value.link_type) {
      return `${indent}link: ${linkUrl(value) || '(empty)'}${value.text ? ` "${value.text}"` : ''}\n`
    }
    if (value.dimensions && value.url) {
      return `${indent}image ${value.dimensions.width}x${value.dimensions.height} alt=${JSON.stringify(value.alt)} ${value.url.split('?')[0]}\n`
    }
    return Object.entries(value).map(([key, child]) => `${indent}${key}:\n${dumpValue(child, `${indent}  `)}`).join('')
  }
  return `${indent}${String(value)}\n`
}

function yamlString(value) {
  return JSON.stringify(String(value))
}

// Every word is kept. Only the markup moves: the opening heading becomes the
// page heading, the "Effective Date" line becomes a field, and the numbered
// section headings move up one level to sit directly under the page heading.
function legalPageMarkdown(document) {
  const slices = document.data.slices ?? []
  const blocks = slices.flatMap(slice => (slice.slice_type === 'rich_text' ? slice.primary?.content ?? [] : []))

  const [headingBlock, dateBlock, ...rest] = blocks
  const effective = /^Effective Date:\s*([A-Za-z]+ \d{1,2}, \d{4})$/u.exec(dateBlock?.text ?? '')?.[1]
  if (headingBlock?.type !== 'heading2' || !effective) {
    throw new Error(`Unexpected structure in ${document.uid}: expected a heading and an effective date first`)
  }

  const promoted = rest.map(block => (block.type === 'heading3' ? { ...block, type: 'heading2' } : block))
  if (promoted.some(block => /^heading[1456]$/u.test(block.type))) {
    throw new Error(`Unexpected heading level in ${document.uid}`)
  }

  const frontmatter = [
    '---',
    `title: ${yamlString(LEGAL_PAGES[document.uid])}`,
    `heading: ${yamlString(headingBlock.text)}`,
    `description: ${yamlString(document.data.meta_description)}`,
    `effectiveDate: ${new Date(`${effective} UTC`).toISOString().slice(0, 10)}`,
    `updatedAt: ${document.last_publication_date.slice(0, 10)}`,
    '---',
    '',
  ].join('\n')

  return frontmatter + richTextToMarkdown(promoted)
}

const documents = await fetchDocuments()
documents.sort((a, b) => `${a.type}/${a.uid ?? ''}`.localeCompare(`${b.type}/${b.uid ?? ''}`))

await mkdir(join(outDir, 'text'), { recursive: true })
await writeFile(join(outDir, 'documents.json'), `${JSON.stringify(documents, null, 2)}\n`)

for (const document of documents) {
  const name = `${document.type}${document.uid ? `-${document.uid}` : ''}`
  const header = `type: ${document.type}\nuid: ${document.uid ?? '(none)'}\nfirst published: ${document.first_publication_date}\nlast published: ${document.last_publication_date}\n\n`
  await writeFile(join(outDir, 'text', `${name}.txt`), header + dumpValue(document.data))
}

const images = [...collectImages(documents).values()]
await writeFile(join(outDir, 'images.json'), `${JSON.stringify(images, null, 2)}\n`)

if (flags.has('--images')) {
  await mkdir(join(outDir, 'images'), { recursive: true })
  for (const image of images) {
    const response = await fetch(image.url)
    if (!response.ok) {
      throw new Error(`${response.status} for ${image.url}`)
    }
    const file = decodeURIComponent(image.url.split('/').pop())
    await writeFile(join(outDir, 'images', file), Buffer.from(await response.arrayBuffer()))
  }
}

if (flags.has('--legal')) {
  await mkdir(join(root, 'content', 'legal'), { recursive: true })
  for (const uid of Object.keys(LEGAL_PAGES)) {
    const document = documents.find(item => item.type === 'page' && item.uid === uid)
    if (!document) {
      throw new Error(`Legal page ${uid} not found in Prismic`)
    }
    await writeFile(join(root, 'content', 'legal', `${uid}.md`), legalPageMarkdown(document))
  }
}

console.log(`Exported ${documents.length} documents and ${images.length} image references to ${outDir}`)
