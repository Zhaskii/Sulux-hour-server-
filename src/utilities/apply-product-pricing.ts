import type { Product } from '../payload-types'

import { computeProductPriceFromDiscount } from './compute-product-price'

type PricingDoc = Partial<
  Pick<Product, 'originalPrice' | 'discountPercentage' | 'price'>
>

function readPositiveNumber(value: unknown): number | null {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}

/** Resolve base MRP and apply discount before validation/save. */
export function applyProductPricing<T extends PricingDoc>(
  data: T | undefined,
  originalDoc?: PricingDoc | null,
): T | undefined {
  if (!data) return data

  const discount =
    data.discountPercentage != null
      ? Number(data.discountPercentage)
      : originalDoc?.discountPercentage != null
        ? Number(originalDoc.discountPercentage)
        : 0

  const original =
    readPositiveNumber(data.originalPrice) ??
    readPositiveNumber(originalDoc?.originalPrice) ??
    readPositiveNumber(data.price) ??
    readPositiveNumber(originalDoc?.price)

  if (original == null) return data

  const computed = computeProductPriceFromDiscount(original, discount)

  return {
    ...data,
    originalPrice: original,
    discountPercentage: discount,
    price: computed.price,
  }
}
