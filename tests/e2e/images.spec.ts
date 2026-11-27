import { expect, test, type Page } from '@playwright/test'

interface Shown {
  alt: string
  /** The file the browser chose. */
  chosen: string
  type: string | null
  status: number | null
  loaded: boolean
  /** Width on screen, in CSS pixels. */
  rendered: number
  /** Width the `sizes` attribute promised for this screen, in CSS pixels. */
  promised: number
  /** Every width on offer, in file pixels. */
  offered: number[]
}

// Opens a page, scrolls each figure into view (they load lazily), waits for it
// and reports what the browser picked and how that compares with what the page promised.
async function figures(page: Page, path: string): Promise<Shown[]> {
  const responses = new Map<string, { status: number, type: string | null }>()
  page.on('response', (response) => {
    responses.set(response.url(), { status: response.status(), type: response.headers()['content-type'] ?? null })
  })
  await page.goto(path)

  const count = await page.locator('main picture img').count()
  const shown: Shown[] = []
  for (let index = 0; index < count; index += 1) {
    const image = page.locator('main picture img').nth(index)
    await image.scrollIntoViewIfNeeded()
    await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true)

    const detail = await image.evaluate((element: HTMLImageElement) => {
      const source = element.parentElement!.querySelector('source')!
      // Work out the `sizes` entry that applies, the way a browser does, and measure it.
      const entry = source.sizes.split(',').map(item => item.trim()).find((item) => {
        const condition = /^(\(.*\))\s+\S.*$/.exec(item)?.[1]
        return !condition || matchMedia(condition).matches
      })!
      const length = entry.replace(/^\([^)]*\)\s+(?=\S)/, '')
      const probe = document.createElement('div')
      probe.style.cssText = `position:absolute;visibility:hidden;width:${length}`
      document.body.append(probe)
      const promised = probe.getBoundingClientRect().width
      probe.remove()

      return {
        alt: element.alt,
        chosen: element.currentSrc,
        loaded: element.complete && element.naturalWidth > 0,
        rendered: element.getBoundingClientRect().width,
        promised,
        offered: source.srcset.split(',').map(item => Number(item.trim().split(/\s+/)[1]!.replace('w', ''))),
      }
    })
    shown.push({ ...detail, status: responses.get(detail.chosen)?.status ?? null, type: responses.get(detail.chosen)?.type ?? null })
  }
  return shown
}

const fileWidth = (address: string) => Number(/-(\d+)\.[a-f0-9]{10}\.\w+$/.exec(address)?.[1])

test.describe('product pictures', () => {
  test('every picture loads as AVIF from its own address', async ({ page }) => {
    const shown = await figures(page, '/products/flavorgpt')

    expect(shown).toHaveLength(9)
    for (const figure of shown) {
      expect(figure.loaded, figure.alt).toBe(true)
      expect(figure.chosen, figure.alt).toMatch(/\/img\/products\/flavorgpt\/[\w-]+-\d+\.[a-f0-9]{10}\.avif$/)
      expect(figure.status, figure.chosen).toBe(200)
      expect(figure.type, figure.chosen).toBe('image/avif')
    }
  })

  test('a browser without AVIF gets WebP', async ({ page }) => {
    // Chromium decides by the `type` of each <source>, so removing the AVIF sources stands in for a browser that cannot read them.
    await page.route('**/products/flavorgpt', async (route) => {
      const response = await route.fetch()
      await route.fulfill({ response, body: (await response.text()).replace(/<source type="image\/avif"[^>]*>/g, '') })
    })
    const shown = await figures(page, '/products/flavorgpt')

    expect(shown).toHaveLength(9)
    for (const figure of shown) {
      expect(figure.chosen, figure.alt).toMatch(/\.webp$/)
      expect(figure.type, figure.chosen).toBe('image/webp')
    }
  })

  // The `sizes` values in app/utils/figures.ts are written by hand from the page grid.
  // If the layout changes and they are not updated, browsers download files that are too big or too soft.
  for (const width of [360, 414, 640, 767, 768, 900, 1023, 1024, 1150, 1263, 1264, 1440, 1920]) {
    test(`at ${width}px wide, each picture is shown at the width the page promised`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })

      for (const figure of await figures(page, '/products/flavorgpt')) {
        const allowed = Math.max(8, figure.rendered * 0.04)
        expect(Math.abs(figure.promised - figure.rendered), `${figure.alt}: promised ${figure.promised}px, shown at ${figure.rendered}px`).toBeLessThanOrEqual(allowed)
      }
    })
  }

  for (const [name, viewport, scale] of [
    ['a laptop', { width: 1440, height: 900 }, 1],
    ['a high-density laptop', { width: 1440, height: 900 }, 2],
    ['a phone', { width: 390, height: 844 }, 3],
  ] as const) {
    test(`${name} downloads a file that fits the screen, not the largest one`, async ({ browser }) => {
      const context = await browser.newContext({ viewport, deviceScaleFactor: scale })
      const page = await context.newPage()

      for (const figure of await figures(page, '/products/flavorgpt')) {
        const needed = figure.promised * scale
        const enough = figure.offered.find(candidate => candidate >= needed) ?? figure.offered.at(-1)!
        // On dense screens Chromium may take the step below when it is nearly enough; it never takes more than is needed.
        const stepBelow = figure.offered[Math.max(0, figure.offered.indexOf(enough) - 1)]!
        expect(scale === 1 ? [enough] : [stepBelow, enough], `${figure.alt}: needs ${Math.round(needed)}px of ${figure.offered.join(', ')}`).toContain(fileWidth(figure.chosen))
      }
      await context.close()
    })
  }

  test('the home page figure follows the same rules', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    const shown = await figures(page, '/')

    expect(shown).toHaveLength(1)
    expect(shown[0]!.type).toBe('image/avif')
    expect(Math.abs(shown[0]!.promised - shown[0]!.rendered)).toBeLessThanOrEqual(shown[0]!.rendered * 0.04)
  })
})
