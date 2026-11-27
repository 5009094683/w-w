import { join, resolve } from 'node:path'
import { addTemplate, addTypeTemplate, createResolver, defineNuxtModule, extendRouteRules, updateTemplates, useLogger } from '@nuxt/kit'
import { IMAGE_BASE, writeImages } from './images'
import { loadContentAndImages } from './load'
import type { ContentData, RouteInfo } from './types'

interface LlmsSection {
  title: string
  links: Array<{ title: string, href: string, description: string }>
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
      nuxt.hook('builder:watch', async (_event, path) => {
        if (!resolve(rootDir, path).startsWith(contentDir)) {
          return
        }
        try {
          ({ data, imageFiles } = await loadContentAndImages(rootDir))
          await prepareImages()
          await updateTemplates({ filter: template => template.filename.startsWith('content/') })
          logger.success('Content reloaded')
        } catch (error) {
          logger.error((error as Error).message)
        }
      })
    }

    logger.info(`${data.routes.length} pages from content/`)
  },
})
