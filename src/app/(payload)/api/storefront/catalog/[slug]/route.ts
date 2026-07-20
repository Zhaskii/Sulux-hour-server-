import config from '@payload-config'
import { getPayload } from 'payload'

import { resolveProductPricingForStorefront } from '@/utilities/resolve-storefront-product-pricing'

/** Must cover largest brand catalog (e.g. Rado ~196 in import sheet). */
const PRODUCTS_LIMIT = 250

const catalogMetaSelect = {
  title: true,
  description: true,
  keywords: true,
  canonicalURL: true,
  robots: true,
} as const

const brandSelect = {
  id: true,
  name: true,
  slug: true,
  tagline: true,
  description: true,
  heroMedia: true,
  isActive: true,
  meta: catalogMetaSelect,
} as const

const categorySelect = {
  id: true,
  name: true,
  slug: true,
  tagline: true,
  description: true,
  heroMedia: true,
  isActive: true,
  meta: catalogMetaSelect,
} as const

const productSelect = {
  id: true,
  name: true,
  slug: true,
  status: true,
  brand: true,
  categories: true,
  shortDescription: true,
  price: true,
  compareAtPrice: true,
  stockQuantity: true,
  featuredImage: true,
  movement: true,
  dialColor: true,
  strapMaterial: true,
  caseSizeMm: true,
  createdAt: true,
} as const

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  if (!slug?.trim()) {
    return Response.json({ error: 'Slug is required' }, { status: 400 })
  }

  try {
    const payload = await getPayload({ config })

    const brandResult = await payload.find({
      collection: 'brands',
      limit: 1,
      depth: 2,
      where: {
        and: [{ slug: { equals: slug } }, { isActive: { equals: true } }],
      },
      select: brandSelect,
    })

    const brand = brandResult.docs[0]

    if (brand) {
      const products = await payload.find({
        collection: 'products',
        limit: PRODUCTS_LIMIT,
        depth: 1,
        sort: '-createdAt',
        where: {
          and: [
            { status: { equals: 'active' } },
            { brand: { equals: brand.id } },
          ],
        },
        select: productSelect,
      })

      return Response.json(
        {
          type: 'brand' as const,
          catalog: brand,
          products: products.docs.map((product) =>
            resolveProductPricingForStorefront(product, { brandSlug: brand.slug }),
          ),
          totalProducts: products.totalDocs,
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
          },
        },
      )
    }

    const categoryResult = await payload.find({
      collection: 'categories',
      limit: 1,
      depth: 2,
      where: {
        and: [{ slug: { equals: slug } }, { isActive: { equals: true } }],
      },
      select: categorySelect,
    })

    const category = categoryResult.docs[0]

    if (category) {
      const products = await payload.find({
        collection: 'products',
        limit: PRODUCTS_LIMIT,
        depth: 1,
        sort: '-createdAt',
        where: {
          and: [
            { status: { equals: 'active' } },
            { categories: { contains: category.id } },
          ],
        },
        select: productSelect,
      })

      return Response.json(
        {
          type: 'category' as const,
          catalog: category,
          products: products.docs.map((product) =>
            resolveProductPricingForStorefront(product),
          ),
          totalProducts: products.totalDocs,
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
          },
        },
      )
    }

    return Response.json({ error: 'Catalog not found' }, { status: 404 })
  } catch (error) {
    console.error('[storefront/catalog]', error)
    return Response.json({ error: 'Failed to load catalog' }, { status: 500 })
  }
}
