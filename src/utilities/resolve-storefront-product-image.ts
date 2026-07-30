import type { Payload } from 'payload'
import type { Media } from '../payload-types'

type ProductLike = {
  name: string
  slug: string
  featuredImage?: number | Media | null
  gallery?: (number | Media)[] | null
}

const PLACEHOLDER_PATTERNS = [
  /placeholder/i,
  /rado-watch-price-in-nepal/i,
  /watch-price-in-nepal/i,
  /images\.unsplash\.com/i,
] as const

function mediaUrl(media: Media): string | null {
  return media.url ?? media.thumbnailURL ?? null
}

function isPlaceholderBlob(text: string): boolean {
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(text))
}

function productReference(name: string, slug?: string): string | null {
  const fromName = name.match(/\b(R\d{4,}[A-Za-z0-9]*)\b/i)?.[1]?.toLowerCase()
  if (fromName) return fromName

  return slug?.match(/\b(r\d{5,}[a-z0-9]*)\b/i)?.[1]?.toLowerCase() ?? null
}

function slugStem(slug: string): string {
  return slug.toLowerCase().replace(/-price-in-nepal$/i, '')
}

export function isValidFeaturedForProduct(product: ProductLike, media: Media): boolean {
  const alt = (media.alt ?? '').toLowerCase()
  const url = (media.url ?? '').toLowerCase()
  const filename = (media.filename ?? '').toLowerCase()
  const blob = `${alt} ${url} ${filename}`

  if (isPlaceholderBlob(blob)) return false

  const ref = productReference(product.name, product.slug)
  if (ref && (alt.includes(ref) || filename.includes(ref) || url.includes(ref))) {
    return true
  }

  if (ref && /product_image-rado-/i.test(filename) && filename.replace(/[^a-z0-9]/g, '').includes(ref.replace(/[^a-z0-9]/g, ''))) {
    return true
  }

  const stem = slugStem(product.slug)
  if (
    stem.length >= 10 &&
    (alt.includes(stem.slice(0, Math.min(32, stem.length))) ||
      filename.includes(stem.slice(0, Math.min(32, stem.length))) ||
      url.includes(stem.slice(0, Math.min(32, stem.length))))
  ) {
    return true
  }

  if (
    (/product-image/i.test(alt) || /product-image/i.test(filename)) &&
    stem.length >= 8 &&
    blob.includes(stem.slice(0, 15))
  ) {
    return true
  }

  if (
    stem.length >= 8 &&
    (alt.startsWith(`${stem}-img`) ||
      alt.includes(`${stem}-img-`) ||
      filename.startsWith(`${stem}-img`) ||
      filename.includes(`${stem}-img-`) ||
      filename.includes(stem))
  ) {
    return true
  }

  return false
}

function isUsableMedia(media: Media | null | undefined): boolean {
  if (!media || typeof media === 'number') return false
  return Boolean(mediaUrl(media)) && !isPlaceholderBlob(`${media.alt ?? ''} ${media.url ?? ''}`)
}

export function resolveStorefrontProductImageSync(product: ProductLike): string | null {
  const featured =
    product.featuredImage && typeof product.featuredImage === 'object'
      ? product.featuredImage
      : null

  if (featured && isValidFeaturedForProduct(product, featured)) {
    return mediaUrl(featured)
  }

  for (const item of product.gallery ?? []) {
    if (!item || typeof item === 'number') continue
    if (isUsableMedia(item) && isValidFeaturedForProduct(product, item)) {
      return mediaUrl(item)
    }
  }

  if (featured && isUsableMedia(featured)) {
    return mediaUrl(featured)
  }

  return null
}

function resolveUsableFeaturedImage(product: ProductLike): string | null {
  const featured =
    product.featuredImage && typeof product.featuredImage === 'object'
      ? product.featuredImage
      : null

  if (featured && isUsableMedia(featured)) {
    return mediaUrl(featured)
  }

  for (const item of product.gallery ?? []) {
    if (!item || typeof item === 'number') continue
    if (isUsableMedia(item)) {
      return mediaUrl(item)
    }
  }

  return null
}

/** Prefer strict product match; fall back to any non-placeholder product image. */
export function resolveStorefrontProductImageForListing(
  product: ProductLike,
): string | null {
  return resolveStorefrontProductImageSync(product) ?? resolveUsableFeaturedImage(product)
}

export async function resolveStorefrontProductImageUrlForListing(
  payload: Payload,
  product: ProductLike,
): Promise<string | null> {
  const strict = await resolveStorefrontProductImageUrl(payload, product)
  if (strict) return strict

  return resolveUsableFeaturedImage(product)
}

async function findMediaByProductHints(
  payload: Payload,
  product: ProductLike,
): Promise<Media | null> {
  const stem = slugStem(product.slug)
  const ref = productReference(product.name, product.slug)
  const slugRef = product.slug.toLowerCase().match(/\b(r\d{5,}[a-z0-9]*)\b/i)?.[1]
  const hints = [
    ref,
    slugRef,
    stem,
    product.slug.toLowerCase(),
    stem.startsWith('rado-') ? stem : `rado-${stem}`,
  ].filter((value): value is string => Boolean(value && value.length >= 6))

  const seen = new Set<string>()

  for (const hint of hints) {
    if (seen.has(hint)) continue
    seen.add(hint)

    const result = await payload.find({
      collection: 'media',
      limit: 10,
      depth: 0,
      where: {
        and: [
          { folder: { equals: 'products' } },
          {
            or: [
              { alt: { contains: hint } },
              { filename: { contains: hint } },
            ],
          },
        ],
      },
    })

    const match = result.docs.find(
      (doc) => isUsableMedia(doc) && isValidFeaturedForProduct(product, doc),
    )

    if (match) return match
  }

  return null
}

export async function resolveStorefrontProductImageUrl(
  payload: Payload,
  product: ProductLike,
): Promise<string | null> {
  const media = await resolveStorefrontProductMedia(payload, product)
  return media ? mediaUrl(media) : null
}

export async function resolveStorefrontProductMedia(
  payload: Payload,
  product: ProductLike,
): Promise<Media | null> {
  const featured =
    product.featuredImage && typeof product.featuredImage === 'object'
      ? product.featuredImage
      : null

  if (featured && isValidFeaturedForProduct(product, featured) && isUsableMedia(featured)) {
    return featured
  }

  for (const item of product.gallery ?? []) {
    if (!item || typeof item === 'number') continue
    if (isUsableMedia(item) && isValidFeaturedForProduct(product, item)) {
      return item
    }
  }

  return findMediaByProductHints(payload, product)
}
