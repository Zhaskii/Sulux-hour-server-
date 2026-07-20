import type { Payload } from 'payload'

import { getBrandDiscountBySlug } from './brand-pricing'
import { applyProductPricing } from './apply-product-pricing'

const PAGE_SIZE = 100

export type SyncProductPricingResult = {
  total: number
  updated: number
  unchanged: number
  skipped: number
  failed: number
}

function readPositive(value: unknown): number | null {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n)
}

function getBrandSlug(brand: unknown): string | null {
  if (!brand || typeof brand !== 'object') return null
  return 'slug' in brand && typeof brand.slug === 'string' ? brand.slug : null
}

/** Prefer stored MRP; recover list price from compare-at when original was saved as sale price. */
export function resolveOriginalMRP(doc: {
  originalPrice?: number | null
  compareAtPrice?: number | null
  price: number
}): number | null {
  const price = readPositive(doc.price)
  const compareAt = readPositive(doc.compareAtPrice)
  const original = readPositive(doc.originalPrice)

  if (compareAt != null && price != null && compareAt > price) {
    if (original == null || original <= price) return compareAt
  }

  if (original != null) return original

  return price
}

export function resolveProductDiscountPercent(
  brandSlug: string | null,
  docDiscount?: number | null,
  doc?: { price: number; compareAtPrice?: number | null },
): number {
  const brandDiscount = getBrandDiscountBySlug(brandSlug)
  if (brandDiscount != null) return brandDiscount

  const stored = Number(docDiscount ?? 0)
  if (Number.isFinite(stored) && stored > 0) {
    return Math.min(100, Math.max(0, stored))
  }

  if (doc) {
    const price = readPositive(doc.price)
    const compareAt = readPositive(doc.compareAtPrice)
    if (price != null && compareAt != null && compareAt > price) {
      return Math.round(((compareAt - price) / compareAt) * 100)
    }
  }

  return 0
}

export type SyncedProductPricing = {
  originalPrice: number
  discountPercentage: number
  price: number
  compareAtPrice: number | null
}

export function computeSyncedProductPricing(doc: {
  originalPrice?: number | null
  compareAtPrice?: number | null
  discountPercentage?: number | null
  price: number
  brand?: unknown
}): SyncedProductPricing | null {
  const originalMRP = resolveOriginalMRP(doc)
  if (originalMRP == null) return null

  const brandSlug = getBrandSlug(doc.brand)
  const discount = resolveProductDiscountPercent(brandSlug, doc.discountPercentage, doc)

  const priced = applyProductPricing(
    {
      originalPrice: originalMRP,
      discountPercentage: discount,
      price: doc.price,
      compareAtPrice: doc.compareAtPrice,
    },
    doc,
  )

  if (!priced?.price || priced.price <= 0) return null

  return {
    originalPrice: Number(priced.originalPrice),
    discountPercentage: Number(priced.discountPercentage ?? 0),
    price: Number(priced.price),
    compareAtPrice:
      priced.compareAtPrice != null ? Number(priced.compareAtPrice) : null,
  }
}

export async function syncAllProductPricing(
  payload: Payload,
  dryRun: boolean,
): Promise<SyncProductPricingResult> {
  let page = 1
  let total = 0
  let updated = 0
  let unchanged = 0
  let skipped = 0
  let failed = 0

  console.log(`Syncing product pricing from original MRP${dryRun ? ' (dry run)' : ''}…`)

  while (true) {
    const batch = await payload.find({
      collection: 'products',
      page,
      limit: PAGE_SIZE,
      depth: 1,
      overrideAccess: true,
    })

    if (batch.docs.length === 0) break

    total += batch.docs.length

    for (const doc of batch.docs) {
      const priced = computeSyncedProductPricing(doc)

      if (!priced) {
        skipped += 1
        console.log(`[skip] ${doc.slug} — no valid original price`)
        continue
      }

      const current = {
        originalPrice: readPositive(doc.originalPrice),
        discountPercentage: Number(doc.discountPercentage ?? 0),
        price: readPositive(doc.price),
        compareAtPrice: readPositive(doc.compareAtPrice),
      }

      const target = {
        originalPrice: priced.originalPrice,
        discountPercentage: priced.discountPercentage,
        price: priced.price,
        compareAtPrice: priced.compareAtPrice,
      }

      const needsUpdate =
        current.originalPrice !== target.originalPrice ||
        current.discountPercentage !== target.discountPercentage ||
        current.price !== target.price ||
        current.compareAtPrice !== target.compareAtPrice

      if (!needsUpdate) {
        unchanged += 1
        continue
      }

      if (dryRun) {
        console.log(
          `[update] ${doc.slug}: MRP ${target.originalPrice} -> sell ${target.price} (compare ${target.compareAtPrice ?? '—'}, ${target.discountPercentage}% off)`,
        )
        updated += 1
        continue
      }

      try {
        await payload.update({
          collection: 'products',
          id: doc.id,
          data: {
            originalPrice: target.originalPrice,
            discountPercentage: target.discountPercentage,
            price: target.price,
            compareAtPrice: target.compareAtPrice ?? undefined,
          },
          overrideAccess: true,
        })
        updated += 1
        console.log(`Updated ${doc.slug} -> ${target.price}`)
      } catch (error) {
        failed += 1
        console.error(`Failed ${doc.slug}:`, error)
      }
    }

    if (!batch.hasNextPage) break
    page += 1
  }

  return { total, updated, unchanged, skipped, failed }
}
