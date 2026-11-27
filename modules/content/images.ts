import { createHash } from 'node:crypto'
import { copyFile, mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { availableParallelism } from 'node:os'
import { dirname, join } from 'node:path'
import sharp from 'sharp'

// Pictures are prepared when the site is built, not when a page is viewed.
// Each file under content/images/ is resized to a few widths and saved as AVIF
// and WebP, plus one file in its own format for anything that reads neither.
//
// The files are named <name>-<width>.<fingerprint>.<format>. The fingerprint
// comes from the picture and from the settings below, so a changed picture
// gets a new address and browsers can keep each file forever. The names use
// plain characters and the real file extension, so every host serves them at
// the address written in the page and with the right content type.

/** Address prefix of the prepared files. */
export const IMAGE_BASE = '/img'

/** Widths in pixels. A picture is never enlarged past its own width. */
const WIDTHS = [320, 480, 640, 880, 1280, 1760]

const OPTIONS = {
  avif: { quality: 55, effort: 4 },
  webp: { quality: 80, effort: 5 },
  png: { compressionLevel: 9 },
  jpeg: { quality: 82, mozjpeg: true },
} as const

type Format = keyof typeof OPTIONS

/** The newer formats a browser is offered, best first. */
const MODERN = [
  { format: 'avif', type: 'image/avif' },
  { format: 'webp', type: 'image/webp' },
] as const

// Part of every fingerprint: changing a width or an encoder setting above
// gives every file a new name.
const SETTINGS = JSON.stringify([WIDTHS, OPTIONS])

export interface ImageFile {
  /** Address the file is served at, starting with IMAGE_BASE. */
  url: string
  /** The picture under content/images/ it is made from. */
  source: string
  width: number
  format: Format
}

export interface PreparedImage {
  /** The file in the picture's own format, at its largest prepared width. */
  src: string
  width: number
  height: number
  /** The same picture in the newer formats, each at every prepared width. */
  sources: Array<{ type: string, srcset: string }>
  files: ImageFile[]
}

function widthsFor(width: number) {
  const widths = WIDTHS.filter(candidate => candidate <= width)
  const largest = widths.at(-1) ?? 0
  // Keep the picture's own width when the nearest step down would lose a lot of detail.
  if (width < WIDTHS.at(-1)! && width > largest * 1.2) {
    widths.push(width)
  }
  return widths
}

/** Works out the files one picture needs, without creating them. */
export async function planImage(imagesDir: string, path: string): Promise<PreparedImage> {
  const source = join(imagesDir, path)
  const bytes = await readFile(source)
  const { width, height, format } = await sharp(bytes).metadata()
  if (!width || !height || (format !== 'png' && format !== 'jpeg')) {
    throw new Error('is not a PNG or JPEG picture')
  }

  const fingerprint = createHash('sha256').update(SETTINGS).update(bytes).digest('hex').slice(0, 10)
  const stem = path.replace(/\.[a-z]+$/u, '')
  const address = (size: number, extension: string) => `${IMAGE_BASE}/${stem}-${size}.${fingerprint}.${extension}`
  const widths = widthsFor(width)
  const largest = widths.at(-1)!
  const files: ImageFile[] = []

  const sources = MODERN.map(({ format: modern, type }) => ({
    type,
    srcset: widths.map((size) => {
      files.push({ url: address(size, modern), source, width: size, format: modern })
      return `${address(size, modern)} ${size}w`
    }).join(', '),
  }))

  const src = address(largest, format === 'jpeg' ? 'jpg' : 'png')
  files.push({ url: src, source, width: largest, format })

  return { src, width: largest, height: Math.round(height * largest / width), sources, files }
}

function encode(file: ImageFile) {
  const resized = sharp(file.source).resize({ width: file.width, withoutEnlargement: true })
  switch (file.format) {
    case 'avif': return resized.avif(OPTIONS.avif).toBuffer()
    case 'webp': return resized.webp(OPTIONS.webp).toBuffer()
    case 'png': return resized.png(OPTIONS.png).toBuffer()
    case 'jpeg': return resized.jpeg(OPTIONS.jpeg).toBuffer()
  }
}

const exists = (path: string) => stat(path).then(() => true, () => false)

/**
 * Writes the files into outDir, laid out as their addresses without IMAGE_BASE.
 * A file that was encoded before is copied from cacheDir, so only new or
 * changed pictures cost time. Returns how many files had to be encoded.
 */
export async function writeImages(files: ImageFile[], outDir: string, cacheDir: string): Promise<number> {
  const queue = [...new Map(files.map(file => [file.url, file])).values()]
  let encoded = 0

  await rm(outDir, { recursive: true, force: true })

  const worker = async () => {
    for (let file = queue.shift(); file; file = queue.shift()) {
      const name = file.url.slice(IMAGE_BASE.length + 1)
      const cached = join(cacheDir, name)

      if (!await exists(cached)) {
        const data = await encode(file)
        await mkdir(dirname(cached), { recursive: true })
        // Written under another name first, so a build stopped halfway never leaves half a file in the cache.
        const partial = `${cached}.${process.pid}.partial`
        await writeFile(partial, data)
        await rename(partial, cached)
        encoded += 1
      }

      const target = join(outDir, name)
      await mkdir(dirname(target), { recursive: true })
      await copyFile(cached, target)
    }
  }

  await Promise.all(Array.from({ length: Math.max(2, Math.ceil(availableParallelism() / 2)) }, worker))
  return encoded
}
