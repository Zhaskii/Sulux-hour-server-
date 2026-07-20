import type { PayloadRequest } from 'payload'

import { getBrandDiscountBySlug } from './brand-pricing'
import { applyProductPricing } from './apply-product-pricing'

type BrandRef = number | { id?: number; slug?: string | null } | null | undefined

export type ProductPricingFields = {
  price: number
  originalPrice?: number | null
  discountPercentage?: number | null
  compareAtPrice?: number | null
  brand?: BrandRef
}

type ResolveProductPricingOptions = {
  brandSlug?: string | null
}

function getBrandSlug(brand: BrandRef): string | null {
  if (!brand || typeof brand !== 'object') return null
  return brand.slug ?? null
}

async function resolveBrandSlug(
  brandRef: BrandRef,
  req?: PayloadRequest,
): Promise<string | null> {
  const populatedSlug = getBrandSlug(brandRef)
  if (populatedSlug) return populatedSlug

  const brandId = typeof brandRef === 'number' ? brandRef : brandRef?.id
  if (!brandId || !req?.payload) return null

  try {
    const brand = await req.payload.findByID({
      collection: 'brands',
      id: brandId,
      depth: 0,
      select: { slug: true },
    })
    return brand?.slug ?? null
  } catch {
    return null
  }
}

function hasStoredSalePricing(
  doc: ProductPricingFields,
  expectedDiscount: number,
): boolean {
  const price = Number(doc.price)
  const compareAt = doc.compareAtPrice != null ? Number(doc.compareAtPrice) : null
  const discount = Number(doc.discountPercentage ?? 0)
  return (
    Number.isFinite(price) &&
    price > 0 &&
    compareAt != null &&
    Number.isFinite(compareAt) &&
    compareAt > price &&
    discount === expectedDiscount
  )
}

function hasActiveDiscountDisplay(
  doc: ProductPricingFields,
  expectedDiscount: number,
): boolean {
  if (hasStoredSalePricing(doc, expectedDiscount)) return true

  const discount = Number(doc.discountPercentage ?? 0)
  const compareAt = doc.compareAtPrice != null ? Number(doc.compareAtPrice) : null
  const price = Number(doc.price)

  return (
    discount === expectedDiscount &&
    compareAt != null &&
    compareAt > price &&
    price > 0
  )
}

function readPositive(value: unknown): number | null {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n)
}

function resolveOriginalForBrandPricing(doc: ProductPricingFields): number | null {
  const original = readPositive(doc.originalPrice)
  if (original != null) return original

  const compareAt = readPositive(doc.compareAtPrice)
  const price = readPositive(doc.price)
  if (compareAt != null && price != null && compareAt > price) return compareAt

  return price
}

function applyBrandPricing<T extends ProductPricingFields>(
  doc: T,
  brandDiscount: number,
): T {
  const original = resolveOriginalForBrandPricing(doc)
  if (original == null) return doc

  const priced = applyProductPricing(
    {
      originalPrice: original,
      discountPercentage: brandDiscount,
      price: doc.price,
      compareAtPrice: doc.compareAtPrice,
    },
    doc,
  )

  if (!priced?.price || priced.price <= 0) return doc

  return {
    ...doc,
    originalPrice: priced.originalPrice ?? doc.originalPrice,
    discountPercentage: priced.discountPercentage,
    price: priced.price,
    compareAtPrice: priced.compareAtPrice,
  }
}

/** Ensure configured brand discounts are reflected in storefront pricing. */
export function resolveProductPricingForStorefront<T extends ProductPricingFields>(
  doc: T,
  options?: ResolveProductPricingOptions,
): T {
  const brandDiscount = getBrandDiscountBySlug(
    options?.brandSlug ?? getBrandSlug(doc.brand),
  )
  if (brandDiscount == null) return doc
  if (hasActiveDiscountDisplay(doc, brandDiscount)) return doc

  return applyBrandPricing(doc, brandDiscount)
}

export async function resolveProductPricingForStorefrontAsync<
  T extends ProductPricingFields,
>(doc: T, req?: PayloadRequest, options?: ResolveProductPricingOptions): Promise<T> {
  const brandDiscount = getBrandDiscountBySlug(
    options?.brandSlug ?? (await resolveBrandSlug(doc.brand, req)),
  )
  if (brandDiscount == null) return doc
  if (hasActiveDiscountDisplay(doc, brandDiscount)) return doc

  return applyBrandPricing(doc, brandDiscount)
}
