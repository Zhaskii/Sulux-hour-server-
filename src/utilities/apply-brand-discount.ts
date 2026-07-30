import type { PayloadRequest } from 'payload'

type BrandRef = number | string | { id?: number | string; slug?: string | null } | null | undefined

async function resolveBrandDiscount(
  brandRef: BrandRef,
  req?: PayloadRequest,
): Promise<number | null> {
  if (!brandRef) return null

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

export async function applyBrandDiscountIfConfigured<T extends Record<string, any>>(
  data: T | undefined,
  originalDoc: { brand?: BrandRef } | null | undefined,
  req?: PayloadRequest,
): Promise<T | undefined> {
  if (!data) return data

  const brandRef = (data.brand as BrandRef | undefined) ?? originalDoc?.brand
  const discount = await resolveBrandDiscount(brandRef, req)

  if (discount == null) return data

  return {
    ...data,
    discountPercentage: discount,
  }
}
