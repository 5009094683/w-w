#!/usr/bin/env node
// Checks a running copy of the site over HTTP: status codes, redirects, headers
// and the public API. It makes no payment and sends no email.
//
//   node scripts/smoke.mjs https://ybxlabs.com           check a deployed site
//   node scripts/smoke.mjs --serve                        start the built Worker locally, check it, stop it
//
// For --serve, run `npm run build:cloudflare` first.

import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createServer } from 'node:net'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const APPLE_PAY_SHA256 = 'd9a1dbf6d278f12d71f1967ecf0f8cf3fe042d82b5b47ef028542397ca447906'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const serve = args.includes('--serve')

// The local Worker gets a port nothing else is using, so the checks can only
// ever reach the build that was just started, never an older one left running.
function freePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer()
    probe.once('error', reject)
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address()
      probe.close(() => resolve(port))
    })
  })
}

const base = (serve ? `http://127.0.0.1:${await freePort()}` : args.find(arg => /^https?:\/\//.test(arg)) ?? '').replace(/\/+$/, '')

if (!base) {
  console.error('Give the address to check, or --serve to start the built Worker locally.')
  process.exit(1)
}

// Scripts Cloudflare adds to pages when the domain's owner turns them on in the
// dashboard: the Web Analytics beacon and bot checks. They are reported below,
// and left out when checking that the site itself ships no scripts.
const CLOUDFLARE_ADDED = /<script\b[^>]*(?:static\.cloudflareinsights\.com|\/cdn-cgi\/challenge-platform\/)[^>]*>(?:<\/script>)?/g
const ownMarkup = body => body.replace(CLOUDFLARE_ADDED, '')

let failed = 0
function check(name, ok, detail = '') {
  if (!ok) failed += 1
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${ok || !detail ? '' : `  (${detail})`}`)
}

async function get(path, headers = {}) {
  const response = await fetch(base + path, { redirect: 'manual', headers: { Accept: 'text/html', ...headers } })
  return { status: response.status, headers: response.headers, body: await response.text() }
}

async function post(path, body) {
  const response = await fetch(base + path, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const text = await response.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    json = {}
  }
  return { status: response.status, json, text }
}

let server
let serverOutput = ''
const serverExited = () => server.exitCode !== null || server.signalCode !== null

function startServer() {
  // Started in its own process group, so that stopping it also stops the
  // Workers runtime that wrangler starts underneath.
  server = spawn(join(root, 'node_modules/.bin/wrangler'), ['dev', '--port', new URL(base).port, '--ip', '127.0.0.1'], {
    cwd: root,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  for (const stream of [server.stdout, server.stderr]) {
    stream.on('data', (chunk) => {
      serverOutput = (serverOutput + chunk).slice(-4000)
    })
  }
}

async function waitUntilUp() {
  for (let attempt = 0; attempt < 180; attempt += 1) {
    if (serverExited()) throw new Error(`wrangler dev stopped before it was ready:\n${serverOutput}`)
    try {
      if ((await fetch(base)).ok) return
    } catch {
      // not listening yet
    }
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  throw new Error(`${base} did not start:\n${serverOutput}`)
}

async function stopServer() {
  if (!server || serverExited()) return
  const exited = new Promise(resolve => server.once('exit', resolve))
  const signal = (name) => {
    try {
      process.kill(-server.pid, name)
    } catch {
      // already gone
    }
  }
  signal('SIGTERM')
  const forced = setTimeout(() => signal('SIGKILL'), 10_000)
  await exited
  clearTimeout(forced)
}

if (serve) {
  startServer()
  for (const name of ['SIGINT', 'SIGTERM']) {
    process.once(name, async () => {
      await stopServer()
      process.exit(1)
    })
  }
}

try {
  if (serve) await waitUntilUp()

  // Prebuilt pages
  for (const path of ['/', '/services', '/services/development', '/products/flavorgpt', '/about-us', '/pricing', '/faq', '/glossary', '/careers', '/privacy-policy']) {
    const page = await get(path)
    check(`${path} is served`, page.status === 200 && page.headers.get('content-type')?.includes('text/html'), `status ${page.status}`)
    check(`${path} ships no scripts`, !/<script(?![^>]*type="(speculationrules|application\/ld\+json)")/.test(ownMarkup(page.body)))
  }
  const contact = await get('/contact-us')
  check('/contact-us is served with its scripts', contact.status === 200 && /<script type="module"/.test(contact.body), `status ${contact.status}`)

  const home = await get('/')
  for (const [name, expected] of [['strict-transport-security', 'max-age=63072000'], ['x-content-type-options', 'nosniff'], ['referrer-policy', 'strict-origin-when-cross-origin'], ['x-frame-options', 'SAMEORIGIN']]) {
    check(`/ sends ${name}`, home.headers.get(name) === expected, String(home.headers.get(name)))
  }
  const paymentHeaders = (await get('/payment')).headers
  check('/payment, which the Worker renders, sends the same security headers', paymentHeaders.get('strict-transport-security') === 'max-age=63072000' && paymentHeaders.get('x-content-type-options') === 'nosniff' && paymentHeaders.get('x-frame-options') === 'SAMEORIGIN', `${paymentHeaders.get('strict-transport-security')}, ${paymentHeaders.get('x-content-type-options')}, ${paymentHeaders.get('x-frame-options')}`)
  const notFoundHeaders = (await get('/no-such-page')).headers
  check('no response says what software the site runs on', ![home.headers, paymentHeaders, notFoundHeaders].some(headers => headers.has('x-powered-by')), `x-powered-by: ${paymentHeaders.get('x-powered-by') ?? notFoundHeaders.get('x-powered-by')}`)

  // One address per page: the www name must lead to the bare domain, not serve a second copy.
  const host = new URL(base).hostname
  if (!serve && host.split('.').length === 2) {
    try {
      const www = await fetch(`https://www.${host}/about-us`, { redirect: 'manual' })
      await www.arrayBuffer()
      check(`www.${host} redirects to ${host}`, [301, 308].includes(www.status) && www.headers.get('location') === `https://${host}/about-us`, `status ${www.status} to ${www.headers.get('location')}`)
    } catch {
      console.log(`note  www.${host} does not answer, so there is nothing to redirect.`)
    }
  }

  // Cloudflare can rewrite pages on their way out. These features are set on
  // the domain in the Cloudflare dashboard, not in this project, and they are
  // off on a workers.dev address, so these checks matter on the real domain.
  const served = [home.body, contact.body]
  check('the contact email is readable in the page', /href="mailto:[^"@\s]+@[^"\s]+"/.test(contact.body))
  check('Cloudflare is not hiding email addresses (Email Address Obfuscation is off)', !served.some(body => /__cf_email__|\/cdn-cgi\/l\/email-protection/.test(body)))
  check('Cloudflare is not rewriting scripts (Rocket Loader is off)', !served.some(body => /rocket-loader/i.test(body)))
  const added = new Set(served.flatMap(body => body.match(CLOUDFLARE_ADDED) ?? []).map(tag => tag.includes('cloudflareinsights') ? 'Web Analytics' : 'bot checks'))
  if (added.size) {
    console.log(`note  Cloudflare adds a script to every page for ${[...added].join(' and ')}. That is a setting on the domain; with it on, pages are no longer script-free.`)
  }

  // Addresses: no trailing slash, real 404s, redirects for moved pages
  const slash = await get('/about-us/')
  check('/about-us/ redirects to /about-us', [301, 307, 308].includes(slash.status) && slash.headers.get('location')?.replace(base, '') === '/about-us', `status ${slash.status} to ${slash.headers.get('location')}`)

  const missing = await get('/this-page-does-not-exist')
  check('an unknown address returns 404', missing.status === 404, `status ${missing.status}`)
  check('the 404 page is the designed one and ships no scripts', missing.body.includes('This page does not exist.') && !/<script type="module"/.test(ownMarkup(missing.body)))
  check('an unknown address under a section returns 404', (await get('/services/not-a-service')).status === 404)

  for (const [from, to, status] of [
    ['/services/flavorai', '/products/flavorai', 301],
    ['/services/flavorai-api', '/products/flavorai-api', 301],
    ['/services/web3.0', '/services/web3', 301],
    ['/pay', '/payment', 302],
  ]) {
    const response = await get(from)
    check(`${from} redirects to ${to} (${status})`, response.status === status && response.headers.get('location')?.replace(base, '') === to, `status ${response.status} to ${response.headers.get('location')}`)
  }

  // Files for crawlers
  for (const [path, type] of [['/robots.txt', 'text/plain'], ['/sitemap.xml', 'xml'], ['/llms.txt', 'text/plain'], ['/llms-full.txt', 'text/plain'], ['/index.md', 'text/markdown'], ['/services/development.md', 'text/markdown']]) {
    const file = await get(path, { Accept: '*/*' })
    check(`${path} is served as ${type}`, file.status === 200 && file.headers.get('content-type')?.includes(type), `status ${file.status}, ${file.headers.get('content-type')}`)
  }

  // Images: every file a page offers is served at the address written there
  // (a redirect would cost a round trip per image), as the type its name
  // says, and may be kept by browsers for good.
  const product = await get('/products/flavorgpt')
  const images = [...new Set(
    [...product.body.matchAll(/\s(?:src|srcset)="([^"]+)"/g)]
      .flatMap(([, value]) => value.replace(/&amp;/g, '&').split(',').map(item => item.trim().split(/\s+/)[0]))
      .filter(address => /^\/[^/].*\.(avif|webp|png|jpg)$/.test(address)),
  )]
  const imageTypes = { avif: 'image/avif', webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg' }
  const imageProblems = { status: [], type: [], cache: [] }
  for (const address of images) {
    const response = await fetch(base + address, { redirect: 'manual' })
    await response.arrayBuffer()
    if (response.status !== 200) imageProblems.status.push(`${address} answered ${response.status}`)
    if (response.headers.get('content-type') !== imageTypes[address.split('.').pop()]) imageProblems.type.push(`${address} is ${response.headers.get('content-type')}`)
    if (!/max-age=31536000/.test(response.headers.get('cache-control') ?? '') || !/immutable/.test(response.headers.get('cache-control') ?? '')) imageProblems.cache.push(`${address} has ${response.headers.get('cache-control')}`)
  }
  check('/products/flavorgpt offers its images as AVIF, WebP and PNG', ['avif', 'webp', 'png'].every(extension => images.some(address => address.endsWith(`.${extension}`))), `${images.length} image addresses found`)
  check(`all ${images.length} image files are served at the address in the page`, !imageProblems.status.length, imageProblems.status.slice(0, 3).join('; '))
  check('each image is served as the type its name says', !imageProblems.type.length, imageProblems.type.slice(0, 3).join('; '))
  check('each image may be kept by the browser for a year', !imageProblems.cache.length, imageProblems.cache.slice(0, 3).join('; '))

  const applePay = await fetch(`${base}/.well-known/apple-developer-merchantid-domain-association`)
  const bytes = Buffer.from(await applePay.arrayBuffer())
  check('the Apple Pay domain file is unchanged', applePay.status === 200 && createHash('sha256').update(bytes).digest('hex') === APPLE_PAY_SHA256)
  check('the Apple Pay domain file is served as application/octet-stream, as before', applePay.headers.get('content-type') === 'application/octet-stream', String(applePay.headers.get('content-type')))

  // Payment pages: rendered on request, with scripts, out of search
  for (const path of ['/payment', '/payment/100INR', '/payment/gateway-selection?amount=100&currency=INR', '/payment/success']) {
    const page = await get(path)
    check(`${path} is served, with scripts, as noindex`, page.status === 200 && /<script type="module"/.test(page.body) && /noindex/.test(page.headers.get('x-robots-tag') ?? ''), `status ${page.status}, x-robots-tag ${page.headers.get('x-robots-tag')}`)
  }
  check('/payment/100.5JPY explains the problem', (await get('/payment/100.5JPY')).body.includes('JPY amounts cannot have decimals'))

  // Public API: only two payment routes, input checked, nothing done without the security check
  for (const route of ['phonepe-auth', 'zoho-auth', 'phonepe-create-order', 'phonepe-verify', 'zoho-create-session', 'zoho-verify', 'razorpay-config']) {
    check(`/api/payment/${route} does not exist`, (await post(`/api/payment/${route}`, {})).status === 404)
  }

  const noToken = await post('/api/payment/create-order', { amount: 100, currency: 'INR' })
  check('create-order refuses a request without the security check', [403, 503].includes(noToken.status), `status ${noToken.status}`)
  const badAmount = await post('/api/payment/create-order', { amount: 100.5, currency: 'JPY' })
  check('create-order rejects 100.5 JPY', badAmount.status === 400 && badAmount.json.statusMessage === 'JPY amounts cannot have decimals', `status ${badAmount.status}`)
  const badOrder = await post('/api/payment/verify', { gateway: 'phonepe', merchantOrderId: '../../refund' })
  check('verify rejects a crafted PhonePe order ID', badOrder.status === 400, `status ${badOrder.status}`)
  const badSignature = await post('/api/payment/verify', { razorpay_order_id: 'order_abc', razorpay_payment_id: 'pay_abc', razorpay_signature: 'not-a-signature' })
  check('verify rejects a malformed Razorpay signature', badSignature.status === 400, `status ${badSignature.status}`)
  for (const response of [noToken, badAmount, badOrder, badSignature]) {
    check('an API error carries no key details', !/rzp_|fingerprint|secret_length|access_token/i.test(response.text))
  }

  const badContact = await post('/api/contact', { name: 'Smoke test', email: 'not-an-email', message: 'Hello' })
  check('contact rejects an invalid email', badContact.status === 400, `status ${badContact.status}`)
  const noCheck = await post('/api/contact', { name: 'Smoke test', email: 'smoke@example.com', message: 'Hello' })
  check('contact refuses a message without the security check', [403, 503].includes(noCheck.status), `status ${noCheck.status}`)
} catch (error) {
  failed += 1
  console.error(`\nStopped early: ${error.message}${error.cause ? ` (${error.cause.message})` : ''}`)
} finally {
  await stopServer()
}

console.log(failed ? `\n${failed} check${failed === 1 ? '' : 's'} failed for ${base}` : `\nAll checks passed for ${base}`)
process.exit(failed ? 1 : 0)
