import tailwindcss from '@tailwindcss/vite'

// A production build needs no environment variables. A staging build sets
// NUXT_SITE_URL to its own address and NUXT_SITE_ENV=staging, which also keeps
// it out of search engines. NUXT_PUBLIC_APP_URL is the name the previous site
// used for the same setting and is still accepted.
const siteUrl = (process.env.NUXT_SITE_URL || process.env.NUXT_PUBLIC_APP_URL || 'https://ybxlabs.com').replace(/\/+$/, '')
const isStaging = process.env.NUXT_SITE_ENV === 'staging'

export default defineNuxtConfig({
  compatibilityDate: '2026-11-26',

  modules: ['@nuxtjs/seo', '@nuxt/image', '@nuxt/fonts', '@nuxt/eslint'],

  devtools: { enabled: false },

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  site: {
    url: siteUrl,
    name: 'YBX Labs',
    defaultLocale: 'en',
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
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
    '/**': { noScripts: true },
    '/contact-us': { noScripts: false, prerender: true },

    // Pages that moved in v2 keep their old addresses working.
    '/services/flavorai': { redirect: { to: '/products/flavorai', statusCode: 301 } },
    '/services/flavorai-api': { redirect: { to: '/products/flavorai-api', statusCode: 301 } },
    '/services/web3.0': { redirect: { to: '/services/web3', statusCode: 301 } },
  },

  skewProtection: false,

  ogImage: {
    zeroRuntime: true,
    defaults: { height: 630 },
  },

  sitemap: {
    zeroRuntime: true,
  },

  aiReady: {
    database: false,
    zeroRuntimeMarkdown: true,
  },

  image: {
    // Every size and format is generated at build time and served as a file.
    provider: 'ipxStatic',
    format: ['avif', 'webp'],
  },

  $development: {
    image: { provider: 'ipx' },
  },

  fonts: {
    families: [
      { name: 'Instrument Sans', provider: 'google', weights: ['400 700'], styles: ['normal'], subsets: ['latin'], global: true },
      { name: 'JetBrains Mono', provider: 'google', weights: [400, 500], styles: ['normal'], subsets: ['latin'], global: true },
    ],
  },

  eslint: {
    config: { stylistic: false },
  },
})
