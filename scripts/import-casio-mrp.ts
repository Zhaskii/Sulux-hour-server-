import 'dotenv/config'

import config from '@payload-config'
import path from 'path'
import { getPayload } from 'payload'
import XLSX from 'xlsx'

const EXPECTED_PRODUCT_COUNT = 55
const WORKBOOK_PATH = path.resolve(process.cwd(), '../MRP list.xlsx')
const SHEET_NAME = 'Casio'
const BRAND_NAME = 'Casio'
const BRAND_SLUG = 'casio'
const PLACEHOLDER_FILENAME = 'casio-archived-product-placeholder.svg'

type WorkbookRow = {
  SN?: unknown
  Name?: unknown
  'Quantity On Hand'?: unknown
  ' MRP with vat '?: unknown
}

type ImportProduct = {
  name: string
  slug: string
  stockQuantity: number
  originalPrice: number
}

function formatSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function readProducts(): ImportProduct[] {
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
      const stockQuantity = Number(row['Quantity On Hand'])
      const originalPrice = Number(row[' MRP with vat '])

      if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
        throw new Error(`Invalid Quantity On Hand for row ${index + 2}: ${name}`)
      }

      if (!Number.isFinite(originalPrice) || originalPrice <= 0) {
        throw new Error(`Invalid MRP with vat for row ${index + 2}: ${name}`)
      }

      return {
        name,
        slug: formatSlug(name),
        stockQuantity,
        originalPrice,
      }
    })

  if (products.length !== EXPECTED_PRODUCT_COUNT) {
    throw new Error(`Expected ${EXPECTED_PRODUCT_COUNT} Casio products, found ${products.length}`)
  }

  const names = new Set<string>()
  const slugs = new Set<string>()

  for (const product of products) {
    if (names.has(product.name)) {
      throw new Error(`Duplicate product name in workbook: ${product.name}`)
    }
    if (slugs.has(product.slug)) {
      throw new Error(`Duplicate product slug in workbook: ${product.slug}`)
    }
    names.add(product.name)
    slugs.add(product.slug)
  }

  return products
}

function placeholderSvg(): Buffer {
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">',
    '<rect width="1200" height="1200" fill="#f5f5f4"/>',
    '<rect x="80" y="80" width="1040" height="1040" fill="none" stroke="#d6d3d1" stroke-width="4"/>',
    '<text x="600" y="570" text-anchor="middle" font-family="Arial, sans-serif" font-size="116" font-weight="700" fill="#061e4a">CASIO</text>',
    '<text x="600" y="660" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" letter-spacing="8" fill="#78716c">IMAGE PENDING</text>',
    '</svg>',
  ].join('')

  return Buffer.from(svg)
}

async function main() {
  const apply = process.argv.includes('--apply')
  const products = readProducts()
  const payload = await getPayload({ config })

  try {
    const existingBrandResult = await payload.find({
      collection: 'brands',
      depth: 0,
      limit: 2,
      overrideAccess: true,
      where: {
        or: [{ slug: { equals: BRAND_SLUG } }, { name: { equals: BRAND_NAME } }],
      },
    })

    if (existingBrandResult.docs.length > 1) {
      throw new Error('Multiple Casio brand records already exist')
    }

    const existingBrand = existingBrandResult.docs[0] ?? null
    let createCount = 0
    let updateCount = 0

    for (const product of products) {
      const existingResult = await payload.find({
        collection: 'products',
        depth: 0,
        limit: 2,
        overrideAccess: true,
        where: {
          slug: { equals: product.slug },
        },
      })

      if (existingResult.docs.length > 1) {
        throw new Error(`Multiple products already use slug "${product.slug}"`)
      }

      const existing = existingResult.docs[0]
      if (!existing) {
        createCount += 1
        continue
      }

      const existingBrandId =
        typeof existing.brand === 'object' ? existing.brand.id : existing.brand

      if (!existingBrand || existingBrandId !== existingBrand.id) {
        throw new Error(`Slug collision: "${product.slug}" belongs to a non-Casio product`)
      }

      updateCount += 1
    }

    console.log(
      JSON.stringify(
        {
          mode: apply ? 'apply' : 'dry-run',
          workbook: WORKBOOK_PATH,
          sheet: SHEET_NAME,
          validProducts: products.length,
          totalStockQuantity: products.reduce((sum, product) => sum + product.stockQuantity, 0),
          brandAction: existingBrand ? 'reuse' : 'create',
          productsToCreate: createCount,
          productsToUpdate: updateCount,
          productStatus: 'archived',
          skuSource: 'ignored',
        },
        null,
        2,
      ),
    )

    if (!apply) {
      console.log('Dry run complete. Re-run with --apply to write to the database.')
      return
    }

    const existingMediaResult = await payload.find({
      collection: 'media',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      where: {
        filename: { equals: PLACEHOLDER_FILENAME },
      },
    })

    const featuredImage =
      existingMediaResult.docs[0] ??
      (await payload.create({
        collection: 'media',
        overrideAccess: true,
        data: {
          alt: 'Casio archived product image pending',
          folder: 'products',
        },
        file: {
          data: placeholderSvg(),
          name: PLACEHOLDER_FILENAME,
          mimetype: 'image/svg+xml',
          size: placeholderSvg().byteLength,
        },
      }))

    const brand =
      existingBrand ??
      (await payload.create({
        collection: 'brands',
        overrideAccess: true,
        data: {
          name: BRAND_NAME,
          slug: BRAND_SLUG,
          isActive: true,
          discountPercentage: 0,
          tagline: 'Casio Watches',
          description: 'Casio watch inventory.',
        },
      }))

    let created = 0
    let updated = 0

    for (const product of products) {
      const existingResult = await payload.find({
        collection: 'products',
        depth: 0,
        limit: 1,
        overrideAccess: true,
        where: {
          slug: { equals: product.slug },
        },
      })

      const data = {
        name: product.name,
        slug: product.slug,
        status: 'archived' as const,
        brand: brand.id,
        shortDescription: `${product.name} from the Casio archived inventory import.`,
        originalPrice: product.originalPrice,
        discountPercentage: 0,
        price: product.originalPrice,
        sku: null,
        stockQuantity: product.stockQuantity,
        featuredImage: featuredImage.id,
        isFeatured: false,
        isLimitedEdition: false,
        limitedEditionOrder: 0,
        showcaseSections: [],
        showcaseOrder: 0,
      }

      const existing = existingResult.docs[0]
      if (existing) {
        await payload.update({
          collection: 'products',
          id: existing.id,
          context: { skipProductCategoriesValidation: true },
          data,
          depth: 0,
          overrideAccess: true,
        })
        updated += 1
      } else {
        await payload.create({
          collection: 'products',
          context: { skipProductCategoriesValidation: true },
          data,
          depth: 0,
          overrideAccess: true,
        })
        created += 1
      }
    }

    const verification = await payload.find({
      collection: 'products',
      depth: 0,
      limit: EXPECTED_PRODUCT_COUNT + 1,
      overrideAccess: true,
      where: {
        and: [{ brand: { equals: brand.id } }, { status: { equals: 'archived' } }],
      },
    })

    if (
      verification.totalDocs !== EXPECTED_PRODUCT_COUNT ||
      verification.docs.some((product) => product.sku)
    ) {
      throw new Error(
        `Verification failed: expected ${EXPECTED_PRODUCT_COUNT} archived Casio products with empty SKUs`,
      )
    }

    console.log(
      JSON.stringify(
        {
          success: true,
          brand: {
            id: brand.id,
            name: brand.name,
            slug: brand.slug,
          },
          created,
          updated,
          archivedCasioProducts: verification.totalDocs,
          totalStockQuantity: verification.docs.reduce(
            (sum, product) => sum + Number(product.stockQuantity),
            0,
          ),
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
