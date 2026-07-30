export function computeProductPriceFromDiscount(
  originalPrice: number,
  discountPercentage: number | null | undefined,
): { price: number } {
  const original = Math.round(originalPrice)
  const discount = Math.min(100, Math.max(0, Number(discountPercentage ?? 0)))

  if (!Number.isFinite(original) || original <= 0) {
    return { price: 0 }
  }

  if (!Number.isFinite(discount) || discount <= 0) {
    return { price: original }
  }

  const price = Math.max(0, Math.round(original * (1 - discount / 100)))

  return {
    price,
  }
}
