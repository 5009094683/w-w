#!/usr/bin/env node
/**
 * Local E2E checks for Razorpay payment flow (no push, no live charge).
 * Usage: node scripts/e2e-razorpay-local.mjs [baseUrl]
 */
const base = process.argv[2] || 'http://localhost:3001'

const results = []

function pass(name, detail = '') {
  results.push({ name, ok: true, detail })
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ''}`)
}

function fail(name, detail = '') {
  results.push({ name, ok: false, detail })
  console.log(`✗ ${name}${detail ? ` — ${detail}` : ''}`)
}

async function fetchJson(path, options = {}) {
  const res = await fetch(`${base}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  })
  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    data = { raw: text.slice(0, 200) }
  }
  return { res, data }
}

async function main() {
  console.log(`\nRazorpay local E2E @ ${base}\n`)

  // 1) Config / auth probe
  {
    const { res, data } = await fetchJson('/api/payment/razorpay-config')
    if (res.ok && data.auth_ok && data.key_id_prefix?.includes('Sud')) {
      pass('razorpay-config', `fp=${data.secret_fingerprint}`)
    } else {
      fail('razorpay-config', JSON.stringify(data))
    }
  }

  // 2) Create order
  let orderId
  let keyId
  {
    const { res, data } = await fetchJson('/api/payment/create-order', {
      method: 'POST',
      body: JSON.stringify({
        amount: 50,
        currency: 'INR',
        gateway: 'razorpay'
      })
    })
    if (res.ok && data.success && data.order_id) {
      orderId = data.order_id
      keyId = data.key_id
      pass('create-order', data.order_id)
    } else {
      fail('create-order', data.statusMessage || data.message || JSON.stringify(data))
    }
  }

  // 3) Payment page HTML
  {
    const res = await fetch(`${base}/payment/50INR?gateway=razorpay`)
    const html = await res.text()
    if (res.ok && html.includes('Complete Your Payment') && html.includes('razorpay')) {
      pass('payment-page', '200 OK')
    } else {
      fail('payment-page', `status=${res.status}`)
    }
  }

  // 4) Verify endpoint rejects missing signature (sanity)
  {
    const { res, data } = await fetchJson('/api/payment/verify', {
      method: 'POST',
      body: JSON.stringify({ gateway: 'razorpay' })
    })
    if (!res.ok && (data.statusCode === 400 || data.statusMessage)) {
      pass('verify-validation', 'rejects incomplete payload')
    } else {
      fail('verify-validation', JSON.stringify(data))
    }
  }

  // 5) Turnstile skipped on localhost (create-order without token)
  if (orderId) {
    pass('turnstile-localhost-skip', 'create-order worked without turnstileToken')
  }

  const failed = results.filter((r) => !r.ok)
  console.log(`\n${results.length - failed.length}/${results.length} passed`)
  if (failed.length) {
    process.exit(1)
  }
  console.log('\nBrowser step: open payment page and click Pay — Razorpay modal should open.')
  console.log(`Order ready: ${orderId} (key ${keyId?.slice(0, 18)}...)\n`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
