import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { defineNuxtModule } from '@nuxt/kit'

// Prebuilt pages carry their stylesheet inside the HTML instead of linking to
// it. The whole stylesheet is about 6 kB compressed, so this costs little and
// saves a round trip before the first paint. Pages rendered on request keep
// the link, so they stay small and the stylesheet stays cacheable for them.
export default defineNuxtModule({
  meta: { name: 'inline-css' },

  setup(_options, nuxt) {
    if (nuxt.options.dev) {
      return
    }

    const stylesheets = new Map<string, Promise<string>>()
    const load = (href: string) => {
      if (!stylesheets.has(href)) {
        stylesheets.set(href, readFile(join(nuxt.options.buildDir, 'dist/client', href), 'utf8'))
      }
      return stylesheets.get(href)!
    }

    nuxt.hook('nitro:init', (nitro) => {
      nitro.hooks.hook('prerender:generate', async (route) => {
        if (!route.fileName?.endsWith('.html') || typeof route.contents !== 'string') {
          return
        }

        const links = [...route.contents.matchAll(/<link rel="stylesheet" href="(\/_nuxt\/[^"]+\.css)"[^>]*>/g)]
        for (const [tag, href] of links) {
          const css = await load(href!)
          if (!css.includes('</style')) {
            route.contents = route.contents.replace(tag, `<style>${css}</style>`)
          }
        }
      })
    })
  },
})
