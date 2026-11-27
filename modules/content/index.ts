import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { addTemplate, addTypeTemplate, createResolver, defineNuxtModule, extendRouteRules, updateTemplates, useLogger } from '@nuxt/kit'
import { IMAGE_BASE, writeImages } from './images'
import { loadContentAndImages } from './load'
import type { ContentData, RouteInfo } from './types'

interface LlmsSection {
  title: string
  links: Array<{ title: string, href: string, description: string }>
}

/** Every file under a folder with its size and time of last change, as one string to compare. */
async function snapshot(directory: string) {
  const entries = await readdir(directory, { recursive: true, withFileTypes: true })
  const files = await Promise.all(entries.filter(entry => entry.isFile()).map(async (entry) => {
    const file = join(entry.parentPath, entry.name)
    const info = await stat(file).catch(() => undefined)
    return info ? `${file} ${info.size} ${info.mtimeMs}` : ''
  }))
  return files.sort().join('\n')
}

// Reads content/ once at build time, checks it against the schema and exposes
// it to the app as typed modules: `import { services } from '#content/services'`.
// There is no database and no request to a CMS when a page is viewed.
// The pictures under content/images/ are resized and converted in the same
// step (see images.ts) and served as plain files.
export default defineNuxtModule({
  meta: { name: 'ybx-content' },

  async setup(_options, nuxt) {
    const logger = useLogger('content')
    const resolver = createResolver(import.meta.url)
    const rootDir = nuxt.options.rootDir
    const contentDir = resolve(rootDir, 'content')
    const outDir = join(nuxt.options.buildDir, 'content')
    const imageDir = join(nuxt.options.buildDir, 'content-images')
    const imageCache = join(rootDir, 'node_modules/.cache/content-images')

    let { data, imageFiles } = await loadContentAndImages(rootDir)
    const keys = Object.keys(data) as Array<keyof ContentData>

    // `nuxt prepare` only writes types, so it leaves the pictures alone.
    const prepareImages = async () => {
      if (nuxt.options._prepare) {
        return
      }
      const started = Date.now()
      const encoded = await writeImages(imageFiles, imageDir, imageCache)
      if (encoded) {
        logger.info(`Prepared ${encoded} new picture files in ${((Date.now() - started) / 1000).toFixed(1)}s`)
      }
    }
    // Done when the build starts, not here: `nuxt build` empties the build
    // folder after the modules are set up.
    nuxt.hook('build:before', prepareImages)

    // A changed picture gets a new address, so each file can be kept forever.
    extendRouteRules(`${IMAGE_BASE}/**`, { headers: { 'Cache-Control': 'public, max-age=31536000, immutable' } })

    for (const key of keys) {
      addTemplate({
        filename: `content/${key}.mjs`,
        write: true,
        getContents: () => `export const ${key} = ${JSON.stringify(data[key], null, 2)}\n`,
      })
    }

    nuxt.options.alias['#content'] = outDir
    nuxt.hook('nitro:config', (config) => {
      config.alias = { ...config.alias, '#content': outDir }
      config.publicAssets = [...(config.publicAssets ?? []), { dir: imageDir, baseURL: IMAGE_BASE, maxAge: 60 * 60 * 24 * 365 }]
      config.prerender ??= {}
      config.prerender.routes = [...new Set([...(config.prerender.routes ?? []), ...data.routes.map(route => route.path)])]
    })

    nuxt.hook('nitro:init', (nitro) => {
      // The generator writes "&" as "&amp;" in the page titles of these two
      // text files. They are read as text, by people and by AI crawlers.
      nitro.hooks.hook('compiled', async () => {
        for (const name of ['llms-full.txt', 'sitemap.md']) {
          const file = join(nitro.options.output.publicDir, name)
          const text = await readFile(file, 'utf8').catch(() => undefined)
          if (text?.includes('&amp;')) {
            await writeFile(file, text.replaceAll('&amp;', '&'))
          }
        }
      })

      // Cloudflare answers /about-us/ with a temporary redirect to /about-us.
      // A _redirects file makes that permanent, and lets Cloudflare answer the
      // site's other redirects itself, without starting the Worker.
      nitro.hooks.hook('compiled', async () => {
        if (!nitro.options.preset.startsWith('cloudflare')) {
          return
        }
        const lines = [
          ...Object.entries(nitro.options.routeRules).flatMap(([from, rule]) =>
            rule.redirect && !from.includes('*') ? [`${from} ${rule.redirect.to} ${rule.redirect.statusCode}`] : []),
          ...data.routes.filter(route => route.path !== '/').map(route => `${route.path}/ ${route.path} 301`),
        ]
        await writeFile(join(nitro.options.output.publicDir, '_redirects'), `${lines.join('\n')}\n`)
      })
    })

    const types = resolver.resolve('./types')
    addTypeTemplate({
      filename: 'types/content.d.ts',
      getContents: () => keys
        .map(key => `declare module '#content/${key}' {\n  export const ${key}: import('${types}').ContentData['${key}']\n}`)
        .join('\n\n') + '\n',
    }, { nitro: true, nuxt: true })

    // llms.txt lists every page with its factual summary, grouped by section.
    const siteUrl = String((nuxt.options as { site?: { url?: string } }).site?.url ?? '').replace(/\/+$/, '')
    const sections: Array<{ title: string, section: RouteInfo['section'] }> = [
      { title: 'Overview', section: 'home' },
      { title: 'Products', section: 'products' },
      { title: 'Services', section: 'services' },
      { title: 'Company', section: 'company' },
      { title: 'Careers', section: 'careers' },
      { title: 'Legal', section: 'legal' },
    ]
    nuxt.hook('ai-ready:llms-txt' as never, ((payload: { sections: LlmsSection[] }) => {
      for (const { title, section } of sections) {
        payload.sections.push({
          title,
          links: data.routes
            .filter(route => route.section === section)
            .map(route => ({
              // The generator escapes "&" as an HTML entity, which is wrong in a text file.
              title: route.title.replace(/&/g, 'and'),
              href: `${siteUrl}${route.path === '/' ? '/index' : route.path}.md`,
              description: route.summary.replace(/\s+/g, ' '),
            })),
        })
      }
    }) as never)

    if (nuxt.options.dev) {
      // Nuxt does not watch content/, so this module does. A saved file is
      // read again and the pages show it without the server restarting.
      // It looks at the files a few times a second instead of asking the
      // system for change events: those miss the second save of a file when
      // an editor saves by replacing it.
      let seen = await snapshot(contentDir)
      let busy = false
      const timer = setInterval(async () => {
        if (busy) {
          return
        }
        busy = true
        try {
          const now = await snapshot(contentDir)
          if (now !== seen) {
            seen = now;
            ({ data, imageFiles } = await loadContentAndImages(rootDir))
            await prepareImages()
            await updateTemplates({ filter: template => template.filename.startsWith('content/') })
            logger.success('Content reloaded')
          }
        } catch (error) {
          logger.error((error as Error).message)
        } finally {
          busy = false
        }
      }, 400)
      timer.unref()
      nuxt.hook('close', () => clearInterval(timer))
    }

    logger.info(`${data.routes.length} pages from content/`)
  },
})
