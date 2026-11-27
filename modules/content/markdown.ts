import rehypeSlug from 'rehype-slug'
import rehypeStringify from 'rehype-stringify'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'

export interface Heading {
  depth: number
  id: string
  text: string
}

export interface RenderedMarkdown {
  html: string
  /** The same content with all markup removed, for structured data and summaries. */
  text: string
  headings: Heading[]
}

interface HastNode {
  type: string
  tagName?: string
  value?: string
  properties?: Record<string, unknown>
  children?: HastNode[]
}

const BLOCK_TAGS = new Set(['p', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'tr', 'blockquote', 'pre', 'br'])

function textOf(node: HastNode): string {
  if (node.type === 'text') {
    return node.value ?? ''
  }
  return (node.children ?? []).map(textOf).join('')
}

function plainText(node: HastNode): string {
  if (node.type === 'text') {
    return node.value ?? ''
  }
  const inner = (node.children ?? []).map(plainText).join('')
  return node.tagName && BLOCK_TAGS.has(node.tagName) ? `${inner}\n` : inner
}

function walk(node: HastNode, visit: (node: HastNode) => void) {
  visit(node)
  for (const child of node.children ?? []) {
    walk(child, visit)
  }
}

function isExternal(href: string) {
  return /^https?:\/\//iu.test(href)
}

/** Collects headings and marks links that leave the site. */
function inspect(collected: { headings: Heading[], text: string }) {
  return () => (tree: HastNode) => {
    walk(tree, (node) => {
      if (node.type !== 'element' || !node.tagName) {
        return
      }

      const heading = /^h([1-6])$/u.exec(node.tagName)
      if (heading) {
        collected.headings.push({
          depth: Number(heading[1]),
          id: String(node.properties?.id ?? ''),
          text: textOf(node).trim(),
        })
      }

      if (node.tagName === 'a' && typeof node.properties?.href === 'string' && isExternal(node.properties.href)) {
        node.properties.rel = ['noopener']
      }

      // A wide table scrolls inside its own box instead of stretching the page.
      if (node.tagName === 'table') {
        node.properties = { ...node.properties, tabindex: 0 }
      }
    })

    collected.text = plainText(tree).replace(/[ \t]+\n/gu, '\n').replace(/\n{2,}/gu, '\n').trim()
  }
}

export function renderMarkdown(source: string): RenderedMarkdown {
  const collected = { headings: [] as Heading[], text: '' }

  const html = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(inspect(collected))
    .use(rehypeStringify)
    .processSync(source)
    .toString()

  return { html, text: collected.text, headings: collected.headings }
}

/** Renders a short field such as a table cell: a single paragraph loses its <p> wrapper. */
export function renderInline(source: string): RenderedMarkdown {
  const rendered = renderMarkdown(source)
  const single = /^<p>([\s\S]*)<\/p>$/u.exec(rendered.html.trim())

  if (single && !single[1]!.includes('<p>')) {
    return { ...rendered, html: single[1]! }
  }
  return rendered
}
