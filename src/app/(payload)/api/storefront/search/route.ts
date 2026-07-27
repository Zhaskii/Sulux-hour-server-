import config from '@payload-config'
import { getPayload } from 'payload'

import {
  resolveStorefrontProductImageForListing,
  resolveStorefrontProductImageUrlForListing,
} from '@/utilities/resolve-storefront-product-image'

const DEFAULT_LIMIT = 8
const MAX_LIMIT = 20
const MIN_QUERY_LENGTH = 2
const BRAND_SEARCH_PAGE_SIZE = 40
const BRAND_SEARCH_MAX_PAGES = 6

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
  gallery: true,
  movement: true,
  dialColor: true,
  strapMaterial: true,
  caseSizeMm: true,
  createdAt: true,
} as const

function emptyList(limit: number) {
  return {
    docs: [],
    totalDocs: 0,
    limit,
    totalPages: 0,
    page: 1,
    pagingCounter: 1,
    hasPrevPage: false,
    hasNextPage: false,
    prevPage: null,
    nextPage: null,
  }
}

async function enrichProductWithImage(
  payload: Awaited<ReturnType<typeof getPayload>>,
  product: Record<string, unknown> & { name: string; slug: string },
) {
  const displayImageUrl = await resolveStorefrontProductImageUrlForListing(payload, product)
  return { ...product, displayImageUrl }
}

async function searchBrandProductsWithImages(
  payload: Awaited<ReturnType<typeof getPayload>>,
  brandIds: number[],
  limit: number,
) {
  const matched: Array<Record<string, unknown> & { displayImageUrl: string }> = []
  let totalDocs = 0
  let page = 1

  while (matched.length < limit && page <= BRAND_SEARCH_MAX_PAGES) {
    const batch = await payload.find({
      collection: 'products',
      page,
      limit: BRAND_SEARCH_PAGE_SIZE,
      depth: 2,
      sort: '-createdAt',
      where: {
        and: [{ status: { equals: 'active' } }, { brand: { in: brandIds } }],
      },
      select: productSelect,
    })

    totalDocs = batch.totalDocs

    for (const product of batch.docs) {
      const displayImageUrl = resolveStorefrontProductImageForListing(product)
      if (!displayImageUrl) continue

      matched.push({ ...product, displayImageUrl })
      if (matched.length >= limit) break
    }

    if (!batch.hasNextPage) break
    page += 1
  }

  return { docs: matched, totalDocs }
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const query = url.searchParams.get('q')?.trim() ?? ''
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number.parseInt(url.searchParams.get('limit') ?? '', 10) || DEFAULT_LIMIT),
  )

  if (query.length < MIN_QUERY_LENGTH) {
    return Response.json(emptyList(limit))
  }

  try {
    const payload = await getPayload({ config })

    const brandMatches = await payload.find({
      collection: 'brands',
      limit: 20,
      depth: 0,
      where: {
        and: [
          { isActive: { equals: true } },
          {
            or: [{ name: { like: query } }, { slug: { like: query } }],
          },
        ],
      },
    })

    const brandIds = brandMatches.docs.map((brand) => brand.id)
    const isBrandSearch = brandIds.length > 0

    if (isBrandSearch) {
      const { docs, totalDocs } = await searchBrandProductsWithImages(
        payload,
        brandIds,
        limit,
      )

      return Response.json(
        {
          docs,
          totalDocs,
          limit,
          totalPages: Math.max(1, Math.ceil(totalDocs / limit)),
          page: 1,
          pagingCounter: 1,
          hasPrevPage: false,
          hasNextPage: totalDocs > limit,
          prevPage: null,
          nextPage: totalDocs > limit ? 2 : null,
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
          },
        },
      )
    }

    const products = await payload.find({
      collection: 'products',
      limit,
      depth: 2,
      sort: '-createdAt',
      where: {
        and: [
          { status: { equals: 'active' } },
          {
            or: [
              { name: { like: query } },
              { slug: { like: query } },
              { shortDescription: { like: query } },
            ],
          },
        ],
      },
      select: productSelect,
    })

    const docs = await Promise.all(
      products.docs.map((product) => enrichProductWithImage(payload, product)),
    )

    return Response.json(
      {
        docs,
        totalDocs: products.totalDocs,
        limit: products.limit,
        totalPages: products.totalPages,
        page: products.page ?? 1,
        pagingCounter: products.pagingCounter,
        hasPrevPage: products.hasPrevPage,
        hasNextPage: products.hasNextPage,
        prevPage: products.prevPage ?? null,
        nextPage: products.nextPage ?? null,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      },
    )
  } catch (error) {
    console.error('[storefront/search]', error)
    return Response.json({ error: 'Failed to search products' }, { status: 500 })
  }
}
