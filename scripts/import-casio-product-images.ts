import 'dotenv/config'

import config from '@payload-config'
import path from 'path'
import { getPayload } from 'payload'
import sharp from 'sharp'
import XLSX from 'xlsx'

const EXPECTED_PRODUCT_COUNT = 55
const WORKBOOK_PATH = path.resolve(process.cwd(), '../MRP list.xlsx')
const SHEET_NAME = 'Casio'
const BRAND_SLUG = 'casio'
const DOWNLOAD_CONCURRENCY = 1
const REQUEST_TIMEOUT_MS = 15_000
const REQUEST_INTERVAL_MS = 500
const SEARCH_RESULTS_TO_TRY = 8

type WorkbookRow = {
  SN?: unknown
  Name?: unknown
  'Internal Reference'?: unknown
}

type CasioProduct = {
  name: string
  slug: string
  reference: string
  model: string
}

type ResolvedImage = CasioProduct & {
  buffer: Buffer
  filename: string
  height: number
  mimeType: string
  sourcePageUrl: string
  sourceUrl: string
  width: number
}

type BingImageResult = {
  desc?: string
  murl?: string
  purl?: string
  t?: string
  turl?: string
}

function formatSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function canonicalCasioModel(reference: string): string {
  const normalized = reference.trim().toUpperCase()
  const model = normalized.replace(/(?:UDF|VDF|DF|DR|DG|MQ)$/u, '')

  if (!model || model === normalized) {
    throw new Error(`Unrecognized Casio regional reference suffix: ${reference}`)
  }

  return model
}

function readProducts(): CasioProduct[] {
  const workbook = XLSX.readFile(WORKBOOK_PATH)
  const sheet = workbook.Sheets[SHEET_NAME]

  if (!sheet) {
    throw new Error(`Sheet "${SHEET_NAME}" was not found in ${WORKBOOK_PATH}`)
  }

  const rows = XLSX.utils.sheet_to_json<WorkbookRow>(sheet, {
    defval: null,
    raw: true,
  })

  const products = rows
    .filter((row) => row.SN != null && typeof row.Name === 'string' && row.Name.trim())
    .map((row, index) => {
      const name = String(row.Name).trim()
      const reference = String(row['Internal Reference'] ?? '').trim()

      if (!reference) {
        throw new Error(`Missing Internal Reference for row ${index + 2}: ${name}`)
      }

      return {
        name,
        slug: formatSlug(name),
        reference,
        model: canonicalCasioModel(reference),
      }
    })

  if (products.length !== EXPECTED_PRODUCT_COUNT) {
    throw new Error(`Expected ${EXPECTED_PRODUCT_COUNT} Casio products, found ${products.length}`)
  }

  const references = new Set<string>()
  const models = new Set<string>()

  for (const product of products) {
    if (references.has(product.reference)) {
      throw new Error(`Duplicate Casio reference in workbook: ${product.reference}`)
    }
    if (models.has(product.model)) {
      throw new Error(`Duplicate canonical Casio model in workbook: ${product.model}`)
    }
    references.add(product.reference)
    models.add(product.model)
  }

  return products
}

async function waitForRequestInterval() {
  await new Promise<void>((resolve) => setTimeout(resolve, REQUEST_INTERVAL_MS))
}

function decodeHtmlAttribute(value: string): string {
  return value
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
}

function modelKey(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/gu, '')
}

function parseBingImageResults(html: string, product: CasioProduct): BingImageResult[] {
  const canonicalKey = modelKey(product.model)
  const results: BingImageResult[] = []

  for (const match of html.matchAll(/\sm="(\{&quot;.*?\})"/gu)) {
    try {
      const result = JSON.parse(decodeHtmlAttribute(match[1])) as BingImageResult
      const searchable = modelKey(`${result.t ?? ''} ${result.desc ?? ''} ${result.purl ?? ''}`)

      if (
        result.murl &&
        result.purl &&
        searchable.includes(canonicalKey) &&
        !results.some((candidate) => candidate.murl === result.murl)
      ) {
        results.push(result)
      }
    } catch {
      // Ignore malformed search result metadata.
    }
  }

  return results
}

async function fetchWithTimeout(url: string, referer?: string): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    await waitForRequestInterval()
    return await fetch(url, {
      headers: {
        Accept: 'image/avif,image/webp,image/png,image/jpeg,image/*,*/*;q=0.8',
        ...(referer ? { Referer: referer } : {}),
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
      },
      redirect: 'follow',
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }
}

async function downloadExactOnlineImage(product: CasioProduct): Promise<ResolvedImage> {
  const query = `"Casio ${product.reference}" watch product`
  const searchUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC3`
  const searchResponse = await fetchWithTimeout(searchUrl)

  if (!searchResponse.ok) {
    throw new Error(`Image search failed with HTTP ${searchResponse.status}`)
  }

  const results = parseBingImageResults(await searchResponse.text(), product)
  const errors: string[] = []

  for (const result of results.slice(0, SEARCH_RESULTS_TO_TRY)) {
    const candidateUrls = [result.murl, result.turl].filter(
      (url, index, urls): url is string => Boolean(url) && urls.indexOf(url) === index,
    )

    for (const sourceUrl of candidateUrls) {
      try {
        const response = await fetchWithTimeout(sourceUrl, result.purl)
        if (!response.ok) {
          errors.push(`${new URL(sourceUrl).hostname}: HTTP ${response.status}`)
          continue
        }

        const buffer = Buffer.from(await response.arrayBuffer())
        const metadata = await sharp(buffer).metadata()
        const width = metadata.width ?? 0
        const height = metadata.height ?? 0

        if (buffer.byteLength < 5_000 || width < 300 || height < 300 || !metadata.format) {
          errors.push(
            `${new URL(sourceUrl).hostname}: invalid image (${buffer.byteLength} bytes, ${width}x${height})`,
          )
          continue
        }

        const normalizedBuffer = await sharp(buffer)
          .rotate()
          .webp({ alphaQuality: 100, quality: 90 })
          .toBuffer()

        return {
          ...product,
          buffer: normalizedBuffer,
          filename: `casio-${product.model.toLowerCase()}.webp`,
          height,
          mimeType: 'image/webp',
          sourcePageUrl: result.purl!,
          sourceUrl,
          width,
        }
      } catch (error) {
        errors.push(
          `${result.purl}: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    }
  }

  throw new Error(
    `No validated exact-model image found for ${product.reference} (${product.model}); ` +
      `${results.length} matching search results. ${errors.slice(0, 5).join('; ')}`,
  )
}

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  task: (value: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(values.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < values.length) {
      const index = nextIndex
      nextIndex += 1
      results[index] = await task(values[index])
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, () => worker()),
  )

  return results
}

async function main() {
  const apply = process.argv.includes('--apply')
  const products = readProducts()

  console.log(`Searching for ${products.length} exact Casio model images...`)
  const resolved = await mapWithConcurrency(products, DOWNLOAD_CONCURRENCY, async (product) => {
    try {
      const image = await downloadExactOnlineImage(product)
      console.log(
        `FOUND ${product.reference} -> ${product.model} (${image.width}x${image.height}, ${image.buffer.byteLength} bytes)`,
      )
      return image
    } catch (error) {
      console.error(`MISSING ${product.reference} -> ${product.model}`)
      return error instanceof Error ? error : new Error(String(error))
    }
  })
  const failures = resolved.filter((result): result is Error => result instanceof Error)
  if (failures.length > 0) {
    throw new AggregateError(
      failures,
      `${failures.length} Casio model image${failures.length === 1 ? '' : 's'} could not be resolved:\n${failures
        .map((error) => error.message)
        .join('\n')}`,
    )
  }
  const images = resolved as ResolvedImage[]

  const duplicateSources = images.filter(
    (image, index) => images.findIndex((candidate) => candidate.sourceUrl === image.sourceUrl) !== index,
  )
  if (duplicateSources.length > 0) {
    throw new Error(
      `Official image verification found duplicate source URLs: ${duplicateSources
        .map((image) => image.reference)
        .join(', ')}`,
    )
  }

  console.log(
    JSON.stringify(
      {
        mode: apply ? 'apply' : 'dry-run',
        resolvedImages: images.length,
        uniqueModels: new Set(images.map((image) => image.model)).size,
        uniqueSourceUrls: new Set(images.map((image) => image.sourceUrl)).size,
        sources: images.map(({ name, reference, model, sourcePageUrl, sourceUrl }) => ({
          name,
          reference,
          model,
          sourcePageUrl,
          sourceUrl,
        })),
      },
      null,
      2,
    ),
  )

  if (!apply) {
    console.log('Dry run complete. Re-run with --apply to upload and assign the images.')
    return
  }

  const payload = await getPayload({ config })

  try {
    const brandResult = await payload.find({
      collection: 'brands',
      depth: 0,
      limit: 2,
      overrideAccess: true,
      where: { slug: { equals: BRAND_SLUG } },
    })
    if (brandResult.totalDocs !== 1) {
      throw new Error(`Expected exactly one Casio brand, found ${brandResult.totalDocs}`)
    }
    const brand = brandResult.docs[0]

    let uploaded = 0
    let reused = 0
    let updatedProducts = 0

    for (const image of images) {
      const productResult = await payload.find({
        collection: 'products',
        depth: 0,
        limit: 2,
        overrideAccess: true,
        where: {
          and: [
            { slug: { equals: image.slug } },
            { brand: { equals: brand.id } },
          ],
        },
      })
      if (productResult.totalDocs !== 1) {
        throw new Error(
          `Expected exactly one Casio product for ${image.name}, found ${productResult.totalDocs}`,
        )
      }

      const existingMediaResult = await payload.find({
        collection: 'media',
        depth: 0,
        limit: 2,
        overrideAccess: true,
        where: { filename: { equals: image.filename } },
      })
      if (existingMediaResult.totalDocs > 1) {
        throw new Error(`Multiple media records use filename ${image.filename}`)
      }

      const alt = `${image.name} Casio product image`
      let media = existingMediaResult.docs[0]

      if (media) {
        if (media.alt !== alt || media.folder !== 'products') {
          media = await payload.update({
            collection: 'media',
            id: media.id,
            depth: 0,
            overrideAccess: true,
            data: { alt, folder: 'products' },
          })
        }
        reused += 1
      } else {
        media = await payload.create({
          collection: 'media',
          depth: 0,
          overrideAccess: true,
          data: { alt, folder: 'products' },
          file: {
            data: image.buffer,
            mimetype: image.mimeType,
            name: image.filename,
            size: image.buffer.byteLength,
          },
        })
        uploaded += 1
      }

      await payload.update({
        collection: 'products',
        id: productResult.docs[0].id,
        context: { skipProductCategoriesValidation: true },
        data: { featuredImage: media.id },
        depth: 0,
        overrideAccess: true,
      })
      updatedProducts += 1
      console.log(`ASSIGNED ${image.reference} -> media ${media.id}`)
    }

    const verification = await payload.find({
      collection: 'products',
      depth: 1,
      limit: EXPECTED_PRODUCT_COUNT + 1,
      overrideAccess: true,
      where: {
        brand: { equals: brand.id },
      },
    })

    if (verification.totalDocs !== EXPECTED_PRODUCT_COUNT) {
      throw new Error(
        `Verification expected ${EXPECTED_PRODUCT_COUNT} Casio products, found ${verification.totalDocs}`,
      )
    }

    const filenames = verification.docs.map((product) => {
      if (!product.featuredImage || typeof product.featuredImage !== 'object') {
        throw new Error(`Verification found no populated featured image for ${product.name}`)
      }
      if (
        product.featuredImage.filename === 'casio-archived-product-placeholder.svg' ||
        !product.featuredImage.filename?.startsWith('casio-') ||
        !product.featuredImage.filename.endsWith('.webp')
      ) {
        throw new Error(`Verification found an invalid Casio featured image for ${product.name}`)
      }
      return product.featuredImage.filename
    })

    if (new Set(filenames).size !== EXPECTED_PRODUCT_COUNT) {
      throw new Error('Verification found duplicate featured images among Casio products')
    }

    console.log(
      JSON.stringify(
        {
          success: true,
          uploaded,
          reused,
          updatedProducts,
          verifiedCasioProducts: verification.totalDocs,
          uniqueFeaturedImages: new Set(filenames).size,
        },
        null,
        2,
      ),
    )
  } finally {
    await Promise.race([
      payload.destroy(),
      new Promise<void>((resolve) => setTimeout(resolve, 5_000)),
    ])
  }
}

try {
  await main()
  process.exit(0)
} catch (error) {
  console.error(error)
  process.exit(1)
}
