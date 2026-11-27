import { describe, expect, it } from 'vitest'
import { calls, callsTo, request, respond, type TestEvent } from './setup'

const contact = (await import('../../server/api/contact.post')).default as unknown as (event: TestEvent) => Promise<unknown>

const TURNSTILE = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const RESEND = 'https://api.resend.com/emails'

const env = { TURNSTILE_SECRET_KEY: 'turnstile-secret', RESEND_API_KEY: 're_unit_test_key' }
const message = { name: 'Asha Patel', email: 'asha@example.com', message: 'We need a backend audit.', turnstileToken: 'visitor-token' }

function services(resendStatus = 200) {
  respond((call) => {
    if (call.url === TURNSTILE) return { success: true }
    if (call.url === RESEND) return new Response(JSON.stringify({ id: 'email_1' }), { status: resendStatus })
    throw new Error(`Unexpected outbound request to ${call.url}`)
  })
}

describe('POST /api/contact', () => {
  it('sends the message through Resend with the visitor as reply-to', async () => {
    services()
    await expect(contact(request({ ...message, company: 'Example Ltd', phone: '+91 90000 00000' }, env))).resolves.toEqual({ success: true })

    const [email] = callsTo(RESEND)
    expect(email?.headers.authorization).toBe('Bearer re_unit_test_key')
    expect(JSON.parse(email!.body)).toMatchObject({
      from: 'website@ybxlabs.com',
      to: ['hello@ybxlabs.com'],
      reply_to: 'asha@example.com',
      subject: '[Website Contact] Asha Patel — Example Ltd',
    })
    expect(JSON.parse(email!.body).text).toContain('We need a backend audit.')
  })

  it('uses the configured addresses', async () => {
    services()
    await contact(request(message, { ...env, CONTACT_EMAIL_TO: 'sales@example.com', CONTACT_EMAIL_FROM: 'site@example.com' }))

    expect(JSON.parse(callsTo(RESEND)[0]!.body)).toMatchObject({ from: 'site@example.com', to: ['sales@example.com'] })
  })

  it('accepts the token under the name the previous form used', async () => {
    services()
    const { turnstileToken, ...rest } = message

    await expect(contact(request({ ...rest, token: turnstileToken }, env))).resolves.toEqual({ success: true })
  })

  it('escapes HTML in every field', async () => {
    services()
    await contact(request({ ...message, name: '<img src=x onerror=alert(1)>', message: '<script>alert(1)</script>' }, env))

    const { html } = JSON.parse(callsTo(RESEND)[0]!.body)
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  })

  it('keeps the subject on one line', async () => {
    services()
    await contact(request({ ...message, name: 'Asha\r\nBcc: someone@example.com' }, env))

    expect(JSON.parse(callsTo(RESEND)[0]!.body).subject).not.toMatch(/[\r\n]/)
  })

  it.each([
    ['a missing name', { name: '' }, 'Please enter your name.'],
    ['an invalid email', { email: 'not-an-email' }, 'Please enter a valid email address.'],
    ['a missing message', { message: '   ' }, 'Please enter a message.'],
    ['a name that is too long', { name: 'x'.repeat(101) }, 'The name is too long.'],
    ['a message that is too long', { message: 'x'.repeat(5001) }, 'The message is too long.'],
  ])('rejects %s before any outside call', async (_label, change, expected) => {
    services()
    await expect(contact(request({ ...message, ...change }, env))).rejects.toMatchObject({ statusCode: 400, statusMessage: expected })
    expect(calls).toHaveLength(0)
  })

  it('requires the security check', async () => {
    services()
    await expect(contact(request({ ...message, turnstileToken: undefined }, env))).rejects.toMatchObject({ statusCode: 403 })
    expect(callsTo(RESEND)).toHaveLength(0)
  })

  it('refuses to run without a Turnstile secret key', async () => {
    services()
    await expect(contact(request(message, { RESEND_API_KEY: 're_unit_test_key' }))).rejects.toMatchObject({ statusCode: 503 })
    expect(calls).toHaveLength(0)
  })

  it('says the form is not configured when there is no Resend key', async () => {
    services()
    await expect(contact(request(message, { TURNSTILE_SECRET_KEY: 'turnstile-secret' }))).rejects.toMatchObject({
      statusCode: 503,
      statusMessage: 'The contact form is not configured. Please email us instead.',
    })
  })

  it('reports a failure when Resend rejects the message', async () => {
    services(422)
    await expect(contact(request(message, env))).rejects.toMatchObject({ statusCode: 502, statusMessage: 'Failed to send email. Please try again.' })
  })
})
