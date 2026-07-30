import type { PayloadRequest } from 'payload'
import { applyProductPricing } from './apply-product-pricing'

type BrandRef = number | string | { id?: number | string; slug?: string | null; discountPercentage?: number | null } | null | undefined

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

function getBrandDiscountSync(brand: BrandRef): number | null {
  if (!brand || typeof brand !== 'object') return null
  return 'discountPercentage' in brand && typeof brand.discountPercentage === 'number'
    ? brand.discountPercentage
    : null
}

async function resolveBrandDiscountAsync(
  brandRef: BrandRef,
  req?: PayloadRequest,
): Promise<number | null> {
  if (!brandRef) return null

  if (typeof brandRef === 'object' && 'discountPercentage' in brandRef && typeof brandRef.discountPercentage === 'number') {
    return brandRef.discountPercentage
  }

  const brandId = typeof brandRef === 'object' ? brandRef.id : brandRef
  if (!brandId || !req?.payload) return null

  try {
    const brand = await req.payload.findByID({
      collection: 'brands',
      id: brandId,
      depth: 0,
      select: { discountPercentage: true },
    })
    return brand?.discountPercentage ?? null
  } catch {
    return null
  }
}

function hasStoredSalePricing(doc: ProductPricingFields): boolean {
  const price = Number(doc.price)
  const original = doc.originalPrice != null ? Number(doc.originalPrice) : null
  return (
    Number.isFinite(price) &&
    price > 0 &&
    original != null &&
    Number.isFinite(original) &&
    original > price
  )
}

function hasActiveDiscountDisplay(
  doc: ProductPricingFields,
  expectedDiscount: number,
): boolean {
  if (hasStoredSalePricing(doc)) return true

  const discount = Number(doc.discountPercentage ?? 0)
  const price = Number(doc.price)

  return (
    discount >= expectedDiscount &&
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

  return readPositive(doc.price)
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
    },
    doc,
  )

  if (!priced?.price || priced.price <= 0) return doc

  return {
    ...doc,
    originalPrice: priced.originalPrice ?? doc.originalPrice,
    discountPercentage: priced.discountPercentage,
    price: priced.price,
  }
}

function computeVirtualCompareAtPrice(priced: ProductPricingFields): number | null {
  const discount = Number(priced.discountPercentage ?? 0)
  const original = readPositive(priced.originalPrice)
  const price = readPositive(priced.price)

  if (discount > 0 && original != null && price != null && original > price) {
    return original
  }
  return null
}

/** Ensure configured brand discounts are reflected in storefront pricing. */
export function resolveProductPricingForStorefront<T extends ProductPricingFields>(
  doc: T,
  options?: ResolveProductPricingOptions,
): T {
  let priced = doc

  const brandDiscount = getBrandDiscountSync(doc.brand)
  if (brandDiscount != null && !hasActiveDiscountDisplay(doc, brandDiscount)) {
    priced = applyBrandPricing(doc, brandDiscount)
  }

  return {
    ...priced,
    compareAtPrice: computeVirtualCompareAtPrice(priced),
  }
}

export async function resolveProductPricingForStorefrontAsync<
  T extends ProductPricingFields,
>(doc: T, req?: PayloadRequest, options?: ResolveProductPricingOptions): Promise<T> {
  let priced = doc

  const brandDiscount = await resolveBrandDiscountAsync(doc.brand, req)
  if (brandDiscount != null && !hasActiveDiscountDisplay(doc, brandDiscount)) {
    priced = applyBrandPricing(doc, brandDiscount)
  }

  return {
    ...priced,
    compareAtPrice: computeVirtualCompareAtPrice(priced),
  }
}
