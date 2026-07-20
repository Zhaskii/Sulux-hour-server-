import type { PayloadRequest } from 'payload'

import { getBrandDiscountBySlug } from './brand-pricing'

type BrandRef = number | { id?: number; slug?: string | null } | null | undefined

async function resolveBrandSlug(
  brandRef: BrandRef,
  req?: PayloadRequest,
): Promise<string | null> {
  if (!brandRef) return null

  if (typeof brandRef === 'object' && brandRef.slug) {
    return brandRef.slug
  }

  const brandId = typeof brandRef === 'number' ? brandRef : brandRef.id
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

export async function applyBrandDiscountIfConfigured<T extends Record<string, unknown>>(
  data: T | undefined,
  originalDoc: { brand?: BrandRef } | null | undefined,
  req?: PayloadRequest,
): Promise<T | undefined> {
  if (!data) return data

  const brandRef = (data.brand as BrandRef | undefined) ?? originalDoc?.brand
  const brandSlug = await resolveBrandSlug(brandRef, req)
  const discount = getBrandDiscountBySlug(brandSlug)

  if (discount == null) return data

  return {
    ...data,
    discountPercentage: discount,
  }
}
