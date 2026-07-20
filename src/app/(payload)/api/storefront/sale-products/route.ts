import config from '@payload-config'
import { getPayload } from 'payload'
import type { Media } from '@/payload-types'

import { resolveProductPricingForStorefront } from '@/utilities/resolve-storefront-product-pricing'
import type { ProductPricingFields } from '@/utilities/resolve-storefront-product-pricing'
import {
  resolveStorefrontProductImageForListing,
  resolveStorefrontProductImageUrlForListing,
} from '@/utilities/resolve-storefront-product-image'
import { hasSalePageDiscount } from '@/utilities/sale-product'

const DEFAULT_LIMIT = 48
const MAX_LIMIT = 250
const PAGE_SIZE = 100
const MAX_PAGES = 50

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

type StorefrontProductDoc = {
  id: number
  name: string
  slug: string
  status: 'draft' | 'active' | 'archived'
  brand: unknown
  categories: unknown
  shortDescription: string
  price: number
  compareAtPrice?: number | null
  stockQuantity: number
  featuredImage?: number | Media | null
  gallery?: (number | Media)[] | null
  movement?: string | null
  dialColor?: string | null
  strapMaterial?: string | null
  caseSizeMm?: number | null
  createdAt: string
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const limit = Math.min(
    Math.max(Number(url.searchParams.get('limit')) || DEFAULT_LIMIT, 1),
    MAX_LIMIT,
  )

  try {
    const payload = await getPayload({ config })
    const saleCandidates: StorefrontProductDoc[] = []

    let page = 1
    let hasNextPage = true

    while (hasNextPage && page <= MAX_PAGES) {
      const batch = await payload.find({
        collection: 'products',
        limit: PAGE_SIZE,
        page,
        depth: 2,
        sort: '-createdAt',
        where: {
          and: [
            { status: { equals: 'active' } },
            { compareAtPrice: { greater_than: 0 } },
            { price: { greater_than: 0 } },
          ],
        },
        select: productSelect,
      })

      for (const product of batch.docs) {
        const priced = resolveProductPricingForStorefront(
          product as StorefrontProductDoc & ProductPricingFields,
        )

        if (
          hasSalePageDiscount(priced.price, priced.compareAtPrice) &&
          !saleCandidates.some((candidate) => candidate.id === priced.id)
        ) {
          saleCandidates.push(priced as StorefrontProductDoc)
        }
      }

      hasNextPage = batch.hasNextPage
      page += 1
    }

    type SaleProductDoc = StorefrontProductDoc & { displayImageUrl: string }

    const resolved = await Promise.all(
      saleCandidates.map(async (product) => {
        let displayImageUrl = resolveStorefrontProductImageForListing(product)
        if (!displayImageUrl) {
          displayImageUrl = await resolveStorefrontProductImageUrlForListing(
            payload,
            product,
          )
        }
        return displayImageUrl ? { ...product, displayImageUrl } : null
      }),
    )

    const docs = resolved
      .filter((doc): doc is SaleProductDoc => doc != null)
      .slice(0, limit)

    return Response.json(
      {
        docs,
        totalDocs: docs.length,
        limit,
        totalPages: 1,
        page: 1,
        pagingCounter: 1,
        hasPrevPage: false,
        hasNextPage: false,
        prevPage: null,
        nextPage: null,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      },
    )
  } catch (error) {
    console.error('[storefront/sale-products]', error)
    return Response.json({ error: 'Failed to load sale products' }, { status: 500 })
  }
}
