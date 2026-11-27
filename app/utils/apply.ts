const APPLY_FIELDS = [
  'Intro video: [link]',
  'LinkedIn: [link]',
  'GitHub: [link]',
  'X/Twitter: [link]',
  'Resume: [link]',
  'Anything else: [link or info]',
]

function applicationMessage(jobTitle: string) {
  return `Hi! I'd like to apply for "${jobTitle}" at YBX Labs.\n\nHere are my details:\n\n${APPLY_FIELDS.join('\n')}`
}

/** Opens Telegram with the application message filled in. */
export function telegramApplyHref(telegramUrl: string, jobTitle: string): string {
  return `${telegramUrl}?text=${encodeURIComponent(applicationMessage(jobTitle))}`
}

/** Opens the visitor's email app with the application message filled in. */
export function emailApplyHref(email: string, jobTitle: string): string {
  const subject = encodeURIComponent(`Application: ${jobTitle}`)
  return `mailto:${email}?subject=${subject}&body=${encodeURIComponent(applicationMessage(jobTitle))}`
}
