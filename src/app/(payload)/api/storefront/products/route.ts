import config from '@payload-config'
import { getPayload } from 'payload'
import type { Media } from '@/payload-types'

import {
  resolveStorefrontProductImageForListing,
  resolveStorefrontProductImageUrl,
} from '@/utilities/resolve-storefront-product-image'
import { resolveProductPricingForStorefront } from '@/utilities/resolve-storefront-product-pricing'
import type { ProductPricingFields } from '@/utilities/resolve-storefront-product-pricing'

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
  originalPrice: true,
  discountPercentage: true,
  sku: true,
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
  categories?: unknown
  shortDescription: string
  price: number
  originalPrice?: number | null
  discountPercentage?: number | null
  compareAtPrice?: number | null
  sku?: string | null
  stockQuantity: number
  featuredImage?: number | Media | null
  gallery?: (number | Media)[] | null
  movement?: string | null
  dialColor?: string | null
  strapMaterial?: string | null
  caseSizeMm?: number | null
  createdAt: string
}

export async function GET() {
  try {
    const payload = await getPayload({ config })
    const candidates: StorefrontProductDoc[] = []

    // Collect every active product across paginated Payload reads.
    let page = 1
    let hasNextPage = true

    while (hasNextPage && page <= MAX_PAGES) {
      const batch = await payload.find({
        collection: 'products',
        limit: PAGE_SIZE,
        page,
        depth: 1,
        sort: '-createdAt',
        where: {
          status: { equals: 'active' },
        },
        select: productSelect,
      })

      candidates.push(...batch.docs)
      hasNextPage = batch.hasNextPage
      page += 1
    }

    const FALLBACK_IMAGE_URL =
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=600&auto=format&fit=crop'

    const docs = candidates.map((product) => {
      const displayImageUrl =
        resolveStorefrontProductImageForListing(product) || FALLBACK_IMAGE_URL

      const priced = resolveProductPricingForStorefront(
        product as StorefrontProductDoc & ProductPricingFields,
      )
      return { ...priced, displayImageUrl }
    })

    return Response.json(
      {
        docs,
        totalDocs: docs.length,
        limit: docs.length,
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
    console.error('[storefront/products]', error)
    return Response.json({ error: 'Failed to load products' }, { status: 500 })
  }
}
