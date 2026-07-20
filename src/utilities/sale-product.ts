/** Minimum effective discount for a product to appear on /sales. */
export const MIN_SALE_DISCOUNT_PERCENT = 20

export function getEffectiveDiscountPercent(
  price: number,
  compareAtPrice?: number | null,
): number {
  const current = Number(price)
  const compareAt = compareAtPrice != null ? Number(compareAtPrice) : NaN

  if (!Number.isFinite(current) || current <= 0) return 0
  if (!Number.isFinite(compareAt) || compareAt <= 0) return 0
  if (current >= compareAt) return 0

  return ((compareAt - current) / compareAt) * 100
}

export function hasSalePageDiscount(
  price: number,
  compareAtPrice?: number | null,
): boolean {
  return getEffectiveDiscountPercent(price, compareAtPrice) > MIN_SALE_DISCOUNT_PERCENT
}
