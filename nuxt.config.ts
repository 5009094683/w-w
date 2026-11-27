import { readFileSync } from 'node:fs'
import tailwindcss from '@tailwindcss/vite'
import { parse as parseYaml } from 'yaml'

// A production build needs no environment variables. A staging build sets
// NUXT_SITE_URL to its own address and NUXT_SITE_ENV=staging, which also keeps
// it out of search engines. NUXT_PUBLIC_APP_URL is the name the previous site
// used for the same setting and is still accepted.
const siteUrl = (process.env.NUXT_SITE_URL || process.env.NUXT_PUBLIC_APP_URL || 'https://ybxlabs.com').replace(/\/+$/, '')
const isStaging = process.env.NUXT_SITE_ENV === 'staging'

// AI policy. `aiCrawlers` lets the named AI crawlers fetch the site or turns
// them away in robots.txt. `allowAiTraining` is the stated preference about
// using the content to train models; search and AI answers stay allowed.
const aiCrawlers: 'allow' | 'block' = 'allow'
const allowAiTraining = true

const AI_CRAWLERS = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
  'ClaudeBot', 'Claude-User', 'Claude-SearchBot',
  'PerplexityBot', 'Perplexity-User',
  'Google-Extended', 'Applebot-Extended',
  'Amazonbot', 'meta-externalagent', 'CCBot',
  'DuckAssistBot', 'MistralAI-User', 'Bytespider',
]

const company = parseYaml(readFileSync(new URL('./content/site.yaml', import.meta.url), 'utf8')) as { name: string, description: string }

// Nuxt adds every redirect to the router, where the prerender crawler finds it
// and writes a meta-refresh HTML file. Cloudflare would serve that file with
// status 200 in place of the redirect, so redirects are never prerendered.
const redirect = (to: string, statusCode: 301 | 302) => ({ redirect: { to, statusCode }, prerender: false as const })

export default defineNuxtConfig({
  compatibilityDate: '2026-11-26',

  modules: ['@nuxtjs/seo', '@nuxt/fonts', '@nuxt/eslint'],

  devtools: { enabled: false },

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  site: {
    url: siteUrl,
    name: company.name,
    description: company.description.replace(/\s+/g, ' ').trim(),
    defaultLocale: 'en',
    indexable: !isStaging,
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      link: [
        { rel: 'icon', href: '/favicon.ico', sizes: '32x32' },
        { rel: 'icon', href: '/icon.svg', type: 'image/svg+xml' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      ],
      meta: [
        { name: 'theme-color', content: '#f6f3ec', media: '(prefers-color-scheme: light)' },
        { name: 'theme-color', content: '#121214', media: '(prefers-color-scheme: dark)' },
      ],
    },
  },

  experimental: {
    // Routes are fixed at build time, so unknown URLs get a cheap, real 404.
    staticRoutes: true,
    viewTransition: true,
    payloadExtraction: false,
  },

  nitro: {
    cloudflare: {
      deployConfig: true,
      nodeCompat: true,
      wrangler: isStaging ? { name: 'ybxlabs-website-staging' } : {},
    },
    prerender: {
      // Emit /about-us.html (served at /about-us), not /about-us/index.html.
      autoSubfolderIndex: false,
      crawlLinks: true,
      routes: ['/', '/robots.txt', '/sitemap.xml'],
    },
  },

  runtimeConfig: {
    public: {
      // Public by design. Read at build time because the contact page is
      // prebuilt; the older variable names are still accepted.
      turnstileSiteKey: process.env.NUXT_PUBLIC_TURNSTILE_SITE_KEY
        || process.env.NUXT_TURNSTILE_SITE_KEY
        || process.env.TURNSTILE_SITE_KEY
        || '',
    },
  },

  routeRules: {
    // Pages ship as HTML and CSS only. Routes that need JavaScript opt back in.
    '/**': {
      noScripts: true,
      headers: {
        // The value the site sends today. Browsers that have seen it refuse plain HTTP for two years.
        'Strict-Transport-Security': 'max-age=63072000',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'X-Frame-Options': 'SAMEORIGIN',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
      },
    },
    '/contact-us': { noScripts: false, prerender: true },
    '/api/**': { headers: { 'X-Robots-Tag': 'noindex' } },

    // The Apple Pay domain file has no extension, so Cloudflare would send it
    // with no content type at all. This is the type the site has always sent.
    '/.well-known/apple-developer-merchantid-domain-association': { headers: { 'Content-Type': 'application/octet-stream' } },

    // Payment pages are rendered on request, need scripts and stay out of search.
    '/payment': { noScripts: false, prerender: false, robots: false },
    '/payment/**': { noScripts: false, prerender: false, robots: false },
    '/pay': redirect('/payment', 302),

    // Pages that moved in v2 keep their old addresses working.
    '/services/flavorai': redirect('/products/flavorai', 301),
    '/services/flavorai-api': redirect('/products/flavorai-api', 301),
    '/services/web3.0': redirect('/services/web3', 301),
  },

  skewProtection: false,

  robots: {
    groups: [
      { userAgent: ['*'], allow: ['/'] },
      {
        comment: [
          aiCrawlers === 'allow'
            ? 'AI crawlers are welcome here, for search, answers and training.'
            : 'AI crawlers are asked not to fetch this site.',
        ],
        userAgent: AI_CRAWLERS,
        ...(aiCrawlers === 'allow' ? { allow: ['/'] } : { disallow: ['/'] }),
      },
    ],
  },

  sitemap: {
    zeroRuntime: true,
    xsl: false,
    credits: false,
    // lastmod comes from each page's updatedAt, images from each page's <main>.
    autoLastmod: false,
    discoverImages: true,
  },

  ogImage: {
    zeroRuntime: true,
    defaults: { height: 630 },
  },

  aiReady: {
    database: false,
    zeroRuntimeMarkdown: true,
    contentSignal: {
      search: true,
      aiInput: true,
      aiTrain: allowAiTraining,
    },
    llmsTxt: {
      // The page list is written by modules/content from each page's factual summary.
      pages: false,
      notes: [
        'YBX Labs was formerly known as YesbhautikX.',
        'Every page has a Markdown version at the same address with .md added. The home page is /index.md.',
        'Company facts (registration number, address, phone, email) are on /about-us and /contact-us.',
        'Prices on /pricing are averages. The governing texts for billing and refunds are /refund-policy and /terms-conditions.',
      ].join('\n'),
    },
  },

  fonts: {
    families: [
      { name: 'Instrument Sans', provider: 'google', weights: ['400 700'], styles: ['normal'], subsets: ['latin'], global: true, preload: true },
      { name: 'JetBrains Mono', provider: 'google', weights: [400, 500], styles: ['normal'], subsets: ['latin'], global: true, preload: true },
    ],
  },

  eslint: {
    config: { stylistic: false },
  },
})
