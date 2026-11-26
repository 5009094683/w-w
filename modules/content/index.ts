import { join, resolve } from 'node:path'
import { addTemplate, addTypeTemplate, createResolver, defineNuxtModule, updateTemplates, useLogger } from '@nuxt/kit'
import { loadContent } from './load'
import type { ContentData } from './types'

// Reads content/ once at build time, checks it against the schema and exposes
// it to the app as typed modules: `import { services } from '#content/services'`.
// There is no database and no request to a CMS when a page is viewed.
export default defineNuxtModule({
  meta: { name: 'ybx-content' },

  async setup(_options, nuxt) {
    const logger = useLogger('content')
    const resolver = createResolver(import.meta.url)
    const rootDir = nuxt.options.rootDir
    const contentDir = resolve(rootDir, 'content')
    const outDir = join(nuxt.options.buildDir, 'content')

    let data = await loadContent(rootDir)
    const keys = Object.keys(data) as Array<keyof ContentData>

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

    if (nuxt.options.dev) {
      nuxt.hook('builder:watch', async (_event, path) => {
        if (!resolve(rootDir, path).startsWith(contentDir)) {
          return
        }
        try {
          data = await loadContent(rootDir)
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
