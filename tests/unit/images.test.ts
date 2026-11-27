import { mkdtemp, mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { IMAGE_BASE, planImage, writeImages } from '../../modules/content/images'

let dir: string
const imagesDir = () => join(dir, 'images')

async function picture(name: string, width: number, height: number, color = '#d2401c') {
  const file = join(imagesDir(), name)
  await mkdir(join(file, '..'), { recursive: true })
  await sharp({ create: { width, height, channels: 3, background: color } }).png().toFile(file)
}

async function listFiles(root: string, prefix = ''): Promise<string[]> {
  const entries = await readdir(join(root, prefix), { withFileTypes: true })
  const nested = await Promise.all(entries.map(entry => entry.isDirectory() ? listFiles(root, join(prefix, entry.name)) : [join(prefix, entry.name)]))
  return nested.flat().sort()
}

const widths = (srcset: string) => srcset.split(', ').map(candidate => Number(candidate.split(' ')[1]!.replace('w', '')))

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'content-images-'))
  await picture('wide.png', 2400, 1350)
  await picture('shots/tall.png', 900, 2160)
  await picture('between.png', 1152, 1500)
  await picture('small.png', 200, 120)
  await writeFile(join(imagesDir(), 'notes.png'), 'this is not a picture')
})

afterAll(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('planning the picture files', () => {
  it('offers AVIF first, then WebP, then the original format', async () => {
    const image = await planImage(imagesDir(), 'wide.png')

    expect(image.sources.map(source => source.type)).toEqual(['image/avif', 'image/webp'])
    expect(image.src).toMatch(/^\/img\/wide-1760\.[a-f0-9]{10}\.png$/)
    expect(image.files).toHaveLength(13)
  })

  it('never makes a picture wider than it is', async () => {
    const wide = await planImage(imagesDir(), 'wide.png')
    const tall = await planImage(imagesDir(), 'shots/tall.png')
    const small = await planImage(imagesDir(), 'small.png')

    expect(widths(wide.sources[0]!.srcset)).toEqual([320, 480, 640, 880, 1280, 1760])
    expect(widths(tall.sources[0]!.srcset)).toEqual([320, 480, 640, 880])
    expect(widths(small.sources[0]!.srcset)).toEqual([200])
  })

  it('keeps the full width when the next step down would lose a lot', async () => {
    const image = await planImage(imagesDir(), 'between.png')

    expect(widths(image.sources[0]!.srcset)).toEqual([320, 480, 640, 880, 1152])
    expect([image.width, image.height]).toEqual([1152, 1500])
  })

  it('gives the size of the fallback file, keeping the shape of the picture', async () => {
    const image = await planImage(imagesDir(), 'wide.png')

    expect([image.width, image.height]).toEqual([1760, 990])
  })

  it('writes addresses that need no escaping and end in the real format', async () => {
    const image = await planImage(imagesDir(), 'shots/tall.png')

    for (const file of image.files) {
      expect(file.url).toMatch(/^\/img\/shots\/tall-\d+\.[a-f0-9]{10}\.(avif|webp|png)$/)
      expect(file.url.endsWith(`.${file.format}`)).toBe(true)
    }
  })

  it('gives a changed picture new addresses and an unchanged one the same', async () => {
    await picture('changing.png', 700, 400, '#111111')
    const before = await planImage(imagesDir(), 'changing.png')
    const again = await planImage(imagesDir(), 'changing.png')
    await picture('changing.png', 700, 400, '#222222')
    const after = await planImage(imagesDir(), 'changing.png')

    expect(again.src).toBe(before.src)
    expect(after.src).not.toBe(before.src)
    expect(after.files.filter(file => before.files.some(old => old.url === file.url))).toEqual([])
  })

  it('refuses a file that is missing or is not a picture', async () => {
    await expect(planImage(imagesDir(), 'missing.png')).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(planImage(imagesDir(), 'notes.png')).rejects.toThrow()
  })
})

describe('writing the picture files', () => {
  it('creates every file in the format its name says, at the width its name says', async () => {
    const image = await planImage(imagesDir(), 'between.png')
    const out = join(dir, 'out')

    const encoded = await writeImages(image.files, out, join(dir, 'cache'))

    expect(encoded).toBe(image.files.length)
    expect(await listFiles(out)).toEqual(image.files.map(file => file.url.slice(IMAGE_BASE.length + 1)).sort())
    for (const file of image.files) {
      const meta = await sharp(join(out, file.url.slice(IMAGE_BASE.length + 1))).metadata()
      // sharp reports AVIF as the HEIF container with AV1 compression.
      expect(file.format === 'avif' ? meta.compression : meta.format, file.url).toBe(file.format === 'avif' ? 'av1' : file.format)
      expect(meta.width, file.url).toBe(file.width)
    }
  })

  it('makes the newer formats smaller than the original format', async () => {
    const photo = join(imagesDir(), 'noise.png')
    const pixels = Buffer.alloc(640 * 400 * 3)
    for (let index = 0; index < pixels.length; index += 1) pixels[index] = (index * 37 + (index >> 7) * 11) % 251
    await sharp(pixels, { raw: { width: 640, height: 400, channels: 3 } }).blur(3).png().toFile(photo)
    const image = await planImage(imagesDir(), 'noise.png')
    const out = join(dir, 'out-noise')
    await writeImages(image.files, out, join(dir, 'cache'))

    const size = async (format: string) => {
      const file = image.files.find(candidate => candidate.format === format && candidate.width === 640)!
      return (await stat(join(out, file.url.slice(IMAGE_BASE.length + 1)))).size
    }

    expect(await size('avif')).toBeLessThan(await size('png'))
    expect(await size('webp')).toBeLessThan(await size('png'))
  })

  it('keeps a JPEG picture as a JPEG for the fallback file', async () => {
    await sharp({ create: { width: 500, height: 300, channels: 3, background: '#336699' } }).jpeg().toFile(join(imagesDir(), 'photo.jpg'))
    const image = await planImage(imagesDir(), 'photo.jpg')
    const out = join(dir, 'out-jpeg')
    await writeImages(image.files, out, join(dir, 'cache'))

    expect(image.src).toMatch(/^\/img\/photo-480\.[a-f0-9]{10}\.jpg$/)
    expect((await sharp(join(out, image.src.slice(IMAGE_BASE.length + 1))).metadata()).format).toBe('jpeg')
    expect(image.sources.map(source => source.type)).toEqual(['image/avif', 'image/webp'])
  })

  it('reuses files it has made before and clears out ones no longer needed', async () => {
    const out = join(dir, 'out-reuse')
    const cache = join(dir, 'cache-reuse')
    const first = await planImage(imagesDir(), 'small.png')
    const second = await planImage(imagesDir(), 'shots/tall.png')

    expect(await writeImages([...first.files, ...second.files], out, cache)).toBe(first.files.length + second.files.length)
    expect(await writeImages([...first.files, ...first.files], out, cache)).toBe(0)
    expect(await listFiles(out)).toEqual(first.files.map(file => file.url.slice(IMAGE_BASE.length + 1)).sort())
  })
})
