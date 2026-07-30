import config from '@payload-config'
import { getPayload } from 'payload'
import type { Media } from '@/payload-types'

import { resolveProductPricingForStorefront } from '@/utilities/resolve-storefront-product-pricing'
import type { ProductPricingFields } from '@/utilities/resolve-storefront-product-pricing'
import {
  resolveStorefrontProductImageForListing,
  resolveStorefrontProductImageUrlForListing,
} from '@/utilities/resolve-storefront-product-image'
import {
  getEffectiveDiscountPercent,
  hasSalePageDiscount,
  MIN_SALE_DISCOUNT_PERCENT,
} from '@/utilities/sale-product'

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

export async function GET(request: Request) {
  const url = new URL(request.url)
  const limit = Math.min(
    Math.max(Number(url.searchParams.get('limit')) || DEFAULT_LIMIT, 1),
    MAX_LIMIT,
  )
  const minDiscountParam = Number(url.searchParams.get('minDiscount'))
  const minDiscount =
    Number.isFinite(minDiscountParam) && minDiscountParam >= 0
      ? minDiscountParam
      : MIN_SALE_DISCOUNT_PERCENT

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
        depth: 1,
        sort: '-createdAt',
        where: {
          and: [
            { status: { equals: 'active' } },
            { discountPercentage: { greater_than: 0 } },
            { price: { greater_than: 0 } },
          ],
        },
        select: productSelect,
      })

      for (const product of batch.docs) {
        const priced = resolveProductPricingForStorefront(
          product as StorefrontProductDoc & ProductPricingFields,
        )

        const effectiveDiscount = getEffectiveDiscountPercent(
          priced.price,
          priced.compareAtPrice,
        )

        if (
          effectiveDiscount >= minDiscount &&
          !saleCandidates.some((candidate) => candidate.id === priced.id)
        ) {
          saleCandidates.push(priced as StorefrontProductDoc)
        }
      }

      if (minDiscountParam > 20 && saleCandidates.length >= limit * 2) {
        break
      }

      hasNextPage = batch.hasNextPage
      page += 1
    }

    // Sort candidates by highest effective discount percentage descending
    saleCandidates.sort((a, b) => {
      const discA = getEffectiveDiscountPercent(a.price, a.compareAtPrice)
      const discB = getEffectiveDiscountPercent(b.price, b.compareAtPrice)
      if (Math.abs(discB - discA) > 0.01) return discB - discA
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    const FALLBACK_IMAGE_URL =
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=600&auto=format&fit=crop'

    const docs = saleCandidates
      .map((product) => {
        const displayImageUrl =
          resolveStorefrontProductImageForListing(product) || FALLBACK_IMAGE_URL
        return { ...product, displayImageUrl }
      })
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
