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

const APPLE_PAY_SHA256 = 'd9a1dbf6d278f12d71f1967ecf0f8cf3fe042d82b5b47ef028542397ca447906'
const args = process.argv.slice(2)
const serve = args.includes('--serve')
const port = 8799
const base = (serve ? `http://127.0.0.1:${port}` : args.find(arg => /^https?:\/\//.test(arg)) ?? '').replace(/\/+$/, '')

if (!base) {
  console.error('Give the address to check, or --serve to start the built Worker locally.')
  process.exit(1)
}

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

async function waitUntilUp() {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    try {
      if ((await fetch(base)).ok) return
    } catch {
      // not listening yet
    }
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  throw new Error(`${base} did not start`)
}

let server
if (serve) {
  server = spawn('npx', ['wrangler', 'dev', '--port', String(port), '--ip', '127.0.0.1'], { stdio: 'ignore', detached: true })
  await waitUntilUp()
}

try {
  // Prebuilt pages
  for (const path of ['/', '/services', '/services/development', '/products/flavorgpt', '/about-us', '/pricing', '/faq', '/glossary', '/careers', '/privacy-policy']) {
    const page = await get(path)
    check(`${path} is served`, page.status === 200 && page.headers.get('content-type')?.includes('text/html'), `status ${page.status}`)
    check(`${path} ships no scripts`, !/<script(?![^>]*type="(speculationrules|application\/ld\+json)")/.test(page.body))
  }
  const contact = await get('/contact-us')
  check('/contact-us is served with its scripts', contact.status === 200 && /<script type="module"/.test(contact.body), `status ${contact.status}`)

  const home = await get('/')
  for (const [name, expected] of [['x-content-type-options', 'nosniff'], ['referrer-policy', 'strict-origin-when-cross-origin'], ['x-frame-options', 'SAMEORIGIN']]) {
    check(`/ sends ${name}`, home.headers.get(name) === expected, String(home.headers.get(name)))
  }

  // Addresses: no trailing slash, real 404s, redirects for moved pages
  const slash = await get('/about-us/')
  check('/about-us/ redirects to /about-us', [301, 307, 308].includes(slash.status) && slash.headers.get('location')?.replace(base, '') === '/about-us', `status ${slash.status} to ${slash.headers.get('location')}`)

  const missing = await get('/this-page-does-not-exist')
  check('an unknown address returns 404', missing.status === 404, `status ${missing.status}`)
  check('the 404 page is the designed one and ships no scripts', missing.body.includes('This page does not exist.') && !/<script type="module"/.test(missing.body))
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

  const applePay = await fetch(`${base}/.well-known/apple-developer-merchantid-domain-association`)
  const bytes = Buffer.from(await applePay.arrayBuffer())
  check('the Apple Pay domain file is unchanged', applePay.status === 200 && createHash('sha256').update(bytes).digest('hex') === APPLE_PAY_SHA256)

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
} finally {
  if (server) {
    process.kill(-server.pid)
  }
}

console.log(failed ? `\n${failed} check${failed === 1 ? '' : 's'} failed for ${base}` : `\nAll checks passed for ${base}`)
process.exit(failed ? 1 : 0)
