#!/usr/bin/env node
// Tells IndexNow (used by Bing, Yandex and others; not by Google) which pages
// changed, so they are re-crawled soon after a production deploy.
//
//   node scripts/indexnow.mjs                    submit every page in the built sitemap
//   node scripts/indexnow.mjs --since 2026-11-27 submit only pages updated on or after that date
//   node scripts/indexnow.mjs --dry-run          print what would be sent
//
// Run it after `npm run build:cloudflare` and a production deploy. It reads
// .output/public/sitemap.xml and refuses to run for any site but ybxlabs.com.

import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PRODUCTION_HOST = 'ybxlabs.com'
const ENDPOINT = 'https://api.indexnow.org/indexnow'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const since = args.includes('--since') ? args[args.indexOf('--since') + 1] : undefined

if (since && !/^\d{4}-\d{2}-\d{2}$/.test(since)) {
  console.error('--since needs a date in the form YYYY-MM-DD')
  process.exit(1)
}

const sitemap = await readFile(join(root, '.output/public/sitemap.xml'), 'utf8').catch(() => {
  console.error('No built sitemap found. Run `npm run build:cloudflare` first.')
  process.exit(1)
})
const key = (await readFile(join(root, 'public/indexnow-key.txt'), 'utf8')).trim()

const pages = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(([, entry]) => ({
  loc: /<loc>([^<]+)<\/loc>/.exec(entry)?.[1],
  lastmod: /<lastmod>([^<]+)<\/lastmod>/.exec(entry)?.[1]?.slice(0, 10),
})).filter(page => page.loc)

const hosts = new Set(pages.map(page => new URL(page.loc).host))
if (hosts.size !== 1 || !hosts.has(PRODUCTION_HOST)) {
  console.error(`This build is for ${[...hosts].join(', ') || 'no host'}, not ${PRODUCTION_HOST}. Nothing was sent.`)
  process.exit(1)
}

const urlList = pages.filter(page => !since || (page.lastmod && page.lastmod >= since)).map(page => page.loc)
if (!urlList.length) {
  console.log('No pages to submit.')
  process.exit(0)
}

const body = {
  host: PRODUCTION_HOST,
  key,
  keyLocation: `https://${PRODUCTION_HOST}/indexnow-key.txt`,
  urlList,
}

if (dryRun) {
  console.log(`Would submit ${urlList.length} URLs:\n${urlList.join('\n')}`)
  process.exit(0)
}

const response = await fetch(ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body),
})

if (!response.ok) {
  console.error(`IndexNow answered ${response.status} ${response.statusText}: ${await response.text()}`)
  process.exit(1)
}

console.log(`Submitted ${urlList.length} URLs to IndexNow (${response.status}).`)
