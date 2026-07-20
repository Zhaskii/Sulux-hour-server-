/** Standard Sulux discount applied to selected brand catalogs. */
export const STANDARD_BRAND_DISCOUNT_PERCENTAGE = 15

/** Promotional discount for the three brands currently on half-price sale. */
export const HALF_PRICE_BRAND_DISCOUNT_PERCENTAGE = 50

/** Promotional discount for the current Nuun, Baltic, and Traser sale. */
export const FEATURED_BRAND_DISCOUNT_PERCENTAGE = 45

/** Brand slugs with their configured storefront discounts. */
export const BRAND_DISCOUNT_PERCENTAGE_BY_SLUG: Readonly<Record<string, number>> = {
  rado: STANDARD_BRAND_DISCOUNT_PERCENTAGE,
  nuun: FEATURED_BRAND_DISCOUNT_PERCENTAGE,
  norqain: STANDARD_BRAND_DISCOUNT_PERCENTAGE,
  'maurice-lacroix': STANDARD_BRAND_DISCOUNT_PERCENTAGE,
  traser: FEATURED_BRAND_DISCOUNT_PERCENTAGE,
  baltic: FEATURED_BRAND_DISCOUNT_PERCENTAGE,
  tissot: HALF_PRICE_BRAND_DISCOUNT_PERCENTAGE,
  'tw-steel': HALF_PRICE_BRAND_DISCOUNT_PERCENTAGE,
  victorinox: HALF_PRICE_BRAND_DISCOUNT_PERCENTAGE,
}

export const BRANDS_WITH_STANDARD_DISCOUNT = [
  'Rado',
  'Nuun',
  'Norqain',
  'Maurice Lacroix',
  'Traser',
  'Baltic',
  'Tissot',
  'TW Steel',
  'Victorinox',
] as const

export function getBrandDiscountBySlug(
  slug: string | null | undefined,
): number | null {
  if (!slug) return null
  return BRAND_DISCOUNT_PERCENTAGE_BY_SLUG[slug.trim().toLowerCase()] ?? null
}
