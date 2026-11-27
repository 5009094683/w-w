import { z } from 'zod'
import { logEvent, readEnv } from '../utils/env'
import { requireTurnstile } from '../utils/security'

const RESEND_URL = 'https://api.resend.com/emails'

const optionalText = (max: number) => z.string().trim().max(max).optional().transform(value => value || undefined)

const bodySchema = z.object({
  name: z.string().trim().min(1, 'Please enter your name.').max(100, 'The name is too long.'),
  email: z.email('Please enter a valid email address.').max(254),
  company: optionalText(150),
  phone: optionalText(40),
  message: z.string().trim().min(1, 'Please enter a message.').max(5000, 'The message is too long.'),
  turnstileToken: z.string().optional(),
  // The previous form sent the token under this name.
  token: z.string().optional(),
})

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** A header value must stay on one line, or it could add extra headers. */
function singleLine(value: string): string {
  return value.replace(/[\r\n]+/g, ' ')
}

export default defineEventHandler(async (event) => {
  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: parsed.error.issues[0]?.message ?? 'Name, email, and message are required.' })
  }
  const { name, email, company, phone, message } = parsed.data

  await requireTurnstile(event, parsed.data.turnstileToken ?? parsed.data.token)

  const apiKey = readEnv(event, 'RESEND_API_KEY')
  if (!apiKey) {
    logEvent('error', 'resend api key is not configured')
    throw createError({ statusCode: 503, statusMessage: 'The contact form is not configured. Please email us instead.' })
  }

  const rows = [
    ['Name', escapeHtml(name)],
    ['Email', `<a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>`],
    ...(phone ? [['Phone', escapeHtml(phone)]] : []),
    ...(company ? [['Company', escapeHtml(company)]] : []),
  ]

  const response = await fetch(RESEND_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: readEnv(event, 'CONTACT_EMAIL_FROM') ?? 'website@ybxlabs.com',
      to: [readEnv(event, 'CONTACT_EMAIL_TO') ?? 'hello@ybxlabs.com'],
      reply_to: email,
      subject: singleLine(`[Website Contact] ${name}${company ? ` — ${company}` : ''}`),
      text: [`Name: ${name}`, `Email: ${email}`, phone && `Phone: ${phone}`, company && `Company: ${company}`, '', message].filter(line => line !== undefined).join('\n'),
      html: `<div style="font-family: -apple-system, sans-serif; max-width: 600px;">
  <h2 style="color: #111;">New Contact Form Submission</h2>
  <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
    ${rows.map(([label, value]) => `<tr><td style="padding: 8px 0; color: #666; width: 120px;">${label}</td><td style="padding: 8px 0;">${value}</td></tr>`).join('\n    ')}
  </table>
  <div style="padding: 16px; background: #f9f9f9; border-radius: 8px; margin-top: 12px;">
    <p style="margin: 0; white-space: pre-wrap;">${escapeHtml(message)}</p>
  </div>
</div>`,
    }),
  }).catch((error: unknown) => {
    logEvent('error', 'resend request failed', { error: String(error) })
    return undefined
  })

  if (!response?.ok) {
    if (response) {
      logEvent('error', 'resend rejected the message', { status: response.status, body: (await response.text()).slice(0, 500) })
    }
    throw createError({ statusCode: 502, statusMessage: 'Failed to send email. Please try again.' })
  }

  return { success: true }
})
