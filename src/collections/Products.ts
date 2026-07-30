import type { CollectionConfig } from 'payload'

import { catalogAccess } from '../access/collectionAccess'
import { applyBrandDiscountIfConfigured } from '../utilities/apply-brand-discount'
import { applyProductPricing } from '../utilities/apply-product-pricing'
import { formatSlug } from '../utilities/formatSlug'
import { resolveProductPricingForStorefrontAsync } from '../utilities/resolve-storefront-product-pricing'

const productStatuses = [
  {
    label: 'Draft',
    value: 'draft',
  },
  {
    label: 'Active',
    value: 'active',
  },
  {
    label: 'Archived',
    value: 'archived',
  },
]

const showcaseSections = [
  { label: 'Featured', value: 'featured' },
  { label: 'Best Seller', value: 'best-seller' },
  { label: 'Top Seller', value: 'top-seller' },
  { label: 'New Arrival', value: 'new-arrival' },
]

export const Products: CollectionConfig = {
  slug: 'products',

  admin: {
    defaultColumns: ['name', 'brand', 'price', 'stockQuantity', 'status', 'updatedAt'],

    useAsTitle: 'name',
    components: {
      beforeListTable: [
        '/components/ImportExportButtons',
      ],
    },
  },

  access: catalogAccess,

  fields: [
    {
      type: 'tabs',

      tabs: [
        // =========================
        // PRODUCT TAB
        // =========================
        {
          label: 'Product',

          fields: [
            {
              name: 'name',
              type: 'text',
              required: true,
            },

            {
              name: 'slug',
              type: 'text',
              required: true,
              unique: true,

              admin: {
                description: 'URL-friendly product identifier.',
              },
            },

            {
              name: 'status',
              type: 'select',
              defaultValue: 'draft',
              options: productStatuses,
              required: true,
            },

            {
              name: 'brand',
              type: 'relationship',
              relationTo: 'brands',
              required: true,
            },

            {
              name: 'categories',
              type: 'relationship',
              hasMany: true,
              relationTo: 'categories',
              required: false,
              validate: (value, { operation, req }) => {
                if (req?.context?.skipProductCategoriesValidation) {
                  return true
                }
                if (operation === 'create') {
                  if (!value || (Array.isArray(value) && value.length === 0)) {
                    return 'Categories is required.'
                  }
                } else if (operation === 'update') {
                  if (value !== undefined && (!value || (Array.isArray(value) && value.length === 0))) {
                    return 'Categories cannot be empty.'
                  }
                }
                return true
              },
            },

            {
              name: 'shortDescription',
              type: 'textarea',
              required: true,
            },
          ],
        },

        // =========================
        // PRICING TAB
        // =========================
        {
          label: 'Pricing & Inventory',

          fields: [
            {
              name: 'originalPrice',
              type: 'number',
              min: 0,
              admin: {
                description: 'Original MRP (list price before discount).',
              },
            },

            {
              name: 'discountPercentage',
              type: 'number',
              min: 0,
              max: 100,
              defaultValue: 0,
              admin: {
                readOnly: true,
                description: 'Discount off original price. e.g. 10 = 10% off. (Managed via Brand Discount settings)',
              },
            },

            {
              name: 'price',
              type: 'number',
              min: 0,
              required: true,
              admin: {
                readOnly: true,
                description: 'Selling price (auto-calculated from original price minus discount).',
              },
            },

            {
              name: 'compareAtPrice',
              type: 'number',
              virtual: true,
              admin: {
                readOnly: true,
                hidden: true,
              },
              hooks: {
                afterRead: [
                  ({ data }) => {
                    const price = Number(data?.price)
                    const original = Number(data?.originalPrice)
                    const discount = Number(data?.discountPercentage ?? 0)
                    if (discount > 0 && original > 0 && original > price) {
                      return original
                    }
                    return null
                  },
                ],
              },
            },

            {
              name: 'sku',
              type: 'text',
              required: false,
              unique: true,
            },

            {
              name: 'stockQuantity',
              type: 'number',
              defaultValue: 0,
              min: 0,
              required: true,
            },

            {
              name: 'isFeatured',
              type: 'checkbox',
              defaultValue: false,
            },
            {
              name: 'isLimitedEdition',
              type: 'checkbox',
              defaultValue: false,
              admin: {
                description: 'Show on the Limited Edition catalog page.',
              },
            },
            {
              name: 'limitedEditionOrder',
              type: 'number',
              defaultValue: 0,
              admin: {
                description: 'Sort order on the Limited Edition page.',
                condition: (data) => Boolean(data?.isLimitedEdition),
              },
            },
            {
              name: 'showcaseSections',
              type: 'select',
              hasMany: true,
              options: showcaseSections,
              admin: {
                description: 'Homepage showcase buckets (e.g. featured, best-seller, top-seller).',
              },
            },
            {
              name: 'showcaseOrder',
              type: 'number',
              defaultValue: 0,
              admin: {
                description: 'Sort order inside homepage showcase sections.',
              },
            },
          ],
        },

        // =========================
        // IMAGES TAB
        // =========================
        {
          label: 'Images',

          fields: [
            {
              name: 'featuredImage',
              type: 'relationship',
              relationTo: 'media',
              required: true,
              filterOptions: {
                folder: {
                  equals: 'products',
                },
              },
            },

            {
              name: 'gallery',
              type: 'relationship',
              hasMany: true,
              relationTo: 'media',
              filterOptions: {
                folder: {
                  equals: 'products',
                },
              },
            },
            {
              name: 'videoUrl',
              type: 'text',
              admin: {
                description: 'Optional URL for a YouTube, TikTok, or Instagram video.',
              },
            },
          ],
        },

        // =========================
        // WATCH DETAILS TAB
        // =========================
        {
          label: 'Watch Details',

          fields: [
            {
              name: 'gender',
              type: 'select',

              options: [
                {
                  label: 'Men',
                  value: 'men',
                },

                {
                  label: 'Women',
                  value: 'women',
                },

                {
                  label: 'Unisex',
                  value: 'unisex',
                },
              ],
            },

            {
              name: 'movement',
              type: 'select',

              options: [
                {
                  label: 'Automatic',
                  value: 'automatic',
                },

                {
                  label: 'Quartz',
                  value: 'quartz',
                },

                {
                  label: 'Mechanical',
                  value: 'mechanical',
                },

                {
                  label: 'Smart',
                  value: 'smart',
                },
              ],
            },

            {
              name: 'caseMaterial',
              type: 'text',
            },

            {
              name: 'strapMaterial',
              type: 'text',
            },

            {
              name: 'dialColor',
              type: 'text',
            },

            {
              name: 'caseSizeMm',
              type: 'number',
              min: 0,
            },

            {
              name: 'waterResistance',
              type: 'text',
            },

            {
              name: 'warranty',
              type: 'text',
            },

            {
              name: 'specifications',
              type: 'array',

              fields: [
                {
                  name: 'label',
                  type: 'text',
                  required: true,
                },

                {
                  name: 'value',
                  type: 'text',
                  required: true,
                },
              ],
            },
          ],
        },
      ],
    },
  ],

  endpoints: [
    {
      path: '/export',
      method: 'get',
      handler: async (req) => {
        try {
          if (!req.user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          const productsResult = await req.payload.find({
            collection: 'products',
            limit: 0,
            depth: 1,
          })

          const products = productsResult.docs

          const rows = products.map((product) => {
            const brandSlug =
              product.brand && typeof product.brand === 'object'
                ? product.brand.slug
                : ''

            const categoriesSlugs =
              product.categories && Array.isArray(product.categories)
                ? product.categories
                    .map((cat) => (typeof cat === 'object' ? cat.slug : ''))
                    .filter(Boolean)
                    .join(',')
                : ''

            const showcase =
              product.showcaseSections && Array.isArray(product.showcaseSections)
                ? product.showcaseSections.join(',')
                : ''

            return {
              id: product.id,
              name: product.name,
              slug: product.slug,
              sku: product.sku || '',
              status: product.status || 'draft',
              brandSlug,
              categoriesSlugs,
              originalPrice: product.originalPrice ?? '',
              discountPercentage: product.discountPercentage ?? 0,
              stockQuantity: product.stockQuantity ?? 0,
              isFeatured: product.isFeatured ? 'TRUE' : 'FALSE',
              isLimitedEdition: product.isLimitedEdition ? 'TRUE' : 'FALSE',
              limitedEditionOrder: product.limitedEditionOrder ?? 0,
              showcaseSections: showcase,
              showcaseOrder: product.showcaseOrder ?? 0,
              videoUrl: product.videoUrl || '',
              gender: product.gender || '',
              movement: product.movement || '',
              caseMaterial: product.caseMaterial || '',
              strapMaterial: product.strapMaterial || '',
              dialColor: product.dialColor || '',
              caseSizeMm: product.caseSizeMm ?? '',
              waterResistance: product.waterResistance || '',
              warranty: product.warranty || '',
              shortDescription: product.shortDescription || '',
            }
          })

          const xlsx = await import('xlsx')
          const worksheet = xlsx.utils.json_to_sheet(rows)
          const workbook = xlsx.utils.book_new()
          xlsx.utils.book_append_sheet(workbook, worksheet, 'Products')

          const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' })

          return new Response(buffer, {
            status: 200,
            headers: {
              'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'Content-Disposition': 'attachment; filename="products_export.xlsx"',
            },
          })
        } catch (error: any) {
          req.payload.logger.error(`Export products failed: ${error?.message || error}`)
          return new Response(JSON.stringify({ error: error?.message || 'Export failed' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          })
        }
      },
    },
    {
      path: '/import',
      method: 'post',
      handler: async (req) => {
        try {
          if (!req.user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          if (!req.formData) {
            return new Response(JSON.stringify({ error: 'Multipart form data is not supported' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            })
          }
          const formData = await req.formData()
          const file = formData.get('file') as File | null
          if (!file) {
            return new Response(JSON.stringify({ error: 'No file uploaded' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          const arrayBuffer = await file.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)

          const xlsx = await import('xlsx')
          const workbook = xlsx.read(buffer, { type: 'buffer' })
          const sheetName = workbook.SheetNames[0]
          const sheet = workbook.Sheets[sheetName]
          const rows = xlsx.utils.sheet_to_json<any>(sheet)

          let createdCount = 0
          let updatedCount = 0
          const errors: { row: number; name: string; error: string }[] = []

          // Cache brands and categories lookup to reduce DB hits
          const brandsCache: Record<string, string | number> = {}
          const categoriesCache: Record<string, string | number> = {}

          for (let i = 0; i < rows.length; i++) {
            const row = rows[i]
            const rowIndex = i + 2 // 1-based index plus header row

            try {
              const productName = row.name || `Row ${rowIndex}`

              if (!row.name) {
                errors.push({ row: rowIndex, name: productName, error: 'Product name is required' })
                continue
              }

              // Resolve Brand ID from brandSlug
              let brandId: string | number = ''
              if (row.brandSlug) {
                const normalizedBrandSlug = String(row.brandSlug).trim().toLowerCase()
                if (brandsCache[normalizedBrandSlug] !== undefined) {
                  brandId = brandsCache[normalizedBrandSlug]
                } else {
                  const brandRes = await req.payload.find({
                    collection: 'brands',
                    where: { slug: { equals: normalizedBrandSlug } },
                    limit: 1,
                  })
                  if (brandRes.docs[0]) {
                    brandId = brandRes.docs[0].id
                    brandsCache[normalizedBrandSlug] = brandId
                  } else {
                    errors.push({
                      row: rowIndex,
                      name: productName,
                      error: `Brand with slug "${row.brandSlug}" not found`,
                    })
                    continue
                  }
                }
              } else {
                errors.push({ row: rowIndex, name: productName, error: 'Brand slug is required' })
                continue
              }

              // Resolve Category IDs from categoriesSlugs
              const categoryIds: (string | number)[] = []
              if (row.categoriesSlugs) {
                const catSlugs = String(row.categoriesSlugs)
                  .split(',')
                  .map((s) => s.trim().toLowerCase())
                  .filter(Boolean)

                let hasCategoryError = false
                for (const catSlug of catSlugs) {
                  if (categoriesCache[catSlug] !== undefined) {
                    categoryIds.push(categoriesCache[catSlug])
                  } else {
                    const catRes = await req.payload.find({
                      collection: 'categories',
                      where: { slug: { equals: catSlug } },
                      limit: 1,
                    })
                    if (catRes.docs[0]) {
                      categoryIds.push(catRes.docs[0].id)
                      categoriesCache[catSlug] = catRes.docs[0].id
                    } else {
                      errors.push({
                        row: rowIndex,
                        name: productName,
                        error: `Category with slug "${catSlug}" not found`,
                      })
                      hasCategoryError = true
                      break
                    }
                  }
                }
                if (hasCategoryError) continue
              }

              if (categoryIds.length === 0) {
                errors.push({ row: rowIndex, name: productName, error: 'At least one category is required' })
                continue
              }

              // Parse showcase sections
              const showcaseSectionsParsed = row.showcaseSections
                ? String(row.showcaseSections)
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean)
                : []

              // Build the base product document data
              const productData: any = {
                name: String(row.name).trim(),
                slug: row.slug ? String(row.slug).trim() : undefined,
                status: row.status || 'draft',
                brand: brandId,
                categories: categoryIds,
                shortDescription: row.shortDescription ? String(row.shortDescription).trim() : '',
                sku: row.sku ? String(row.sku).trim() : undefined,
                originalPrice: row.originalPrice !== undefined && row.originalPrice !== '' ? Number(row.originalPrice) : undefined,
                discountPercentage: row.discountPercentage !== undefined && row.discountPercentage !== '' ? Number(row.discountPercentage) : 0,
                stockQuantity: row.stockQuantity !== undefined && row.stockQuantity !== '' ? Number(row.stockQuantity) : 0,
                isFeatured: String(row.isFeatured).toUpperCase() === 'TRUE',
                isLimitedEdition: String(row.isLimitedEdition).toUpperCase() === 'TRUE',
                limitedEditionOrder: row.limitedEditionOrder !== undefined && row.limitedEditionOrder !== '' ? Number(row.limitedEditionOrder) : 0,
                showcaseSections: showcaseSectionsParsed,
                showcaseOrder: row.showcaseOrder !== undefined && row.showcaseOrder !== '' ? Number(row.showcaseOrder) : 0,
                videoUrl: row.videoUrl || undefined,
                gender: row.gender || undefined,
                movement: row.movement || undefined,
                caseMaterial: row.caseMaterial || undefined,
                strapMaterial: row.strapMaterial || undefined,
                dialColor: row.dialColor || undefined,
                caseSizeMm: row.caseSizeMm !== undefined && row.caseSizeMm !== '' ? Number(row.caseSizeMm) : undefined,
                waterResistance: row.waterResistance || undefined,
                warranty: row.warranty || undefined,
              }

              // Check if we can find an existing product by ID
              let existingProduct = null
              if (row.id) {
                try {
                  existingProduct = await req.payload.findByID({
                    collection: 'products',
                    id: row.id,
                  })
                } catch (e) {
                  // Not found or invalid format
                }
              }

              if (existingProduct) {
                // Update existing product
                // Keep existing featuredImage if not explicitly provided
                if (row.featuredImageId) {
                  productData.featuredImage = row.featuredImageId
                }
                await req.payload.update({
                  collection: 'products',
                  id: existingProduct.id,
                  data: productData,
                })
                updatedCount++
              } else {
                // Create new product
                // If featuredImageId is not provided, look up the first media item as fallback
                let featuredImageId = row.featuredImageId
                if (!featuredImageId) {
                  const mediaRes = await req.payload.find({
                    collection: 'media',
                    where: { folder: { equals: 'products' } },
                    limit: 1,
                  })
                  featuredImageId = mediaRes.docs[0]?.id
                }
                if (!featuredImageId) {
                  const mediaResGeneral = await req.payload.find({
                    collection: 'media',
                    limit: 1,
                  })
                  featuredImageId = mediaResGeneral.docs[0]?.id
                }

                if (featuredImageId) {
                  productData.featuredImage = featuredImageId
                } else {
                  errors.push({
                    row: rowIndex,
                    name: productName,
                    error: 'Featured image is required for new products, but no media was found in database to use as fallback',
                  })
                  continue
                }

                await req.payload.create({
                  collection: 'products',
                  data: productData,
                })
                createdCount++
              }
            } catch (err: any) {
              errors.push({
                row: rowIndex,
                name: row.name || `Row ${rowIndex}`,
                error: err?.message || 'Unknown database save error',
              })
            }
          }

          return new Response(
            JSON.stringify({
              success: true,
              createdCount,
              updatedCount,
              errorsCount: errors.length,
              errors,
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            },
          )
        } catch (error: any) {
          req.payload.logger.error(`Import products failed: ${error?.message || error}`)
          return new Response(JSON.stringify({ error: error?.message || 'Import failed' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          })
        }
      },
    },
  ],

  hooks: {
    beforeValidate: [
      async ({ data, originalDoc, req }) => applyBrandDiscountIfConfigured(data, originalDoc, req),
      ({ data, originalDoc }) => applyProductPricing(data, originalDoc),
      ({ data }) => {
        if (!data?.name) {
          return data
        }

        return {
          ...data,

          slug: formatSlug(data.slug || data.name),
        }
      },
      ({ data, originalDoc }) => {
        // If status is explicitly updated in the request (e.g. admin changed status in dashboard), respect it
        if (data?.status) {
          return data
        }

        const originalStatus = originalDoc?.status
        const newStock = data?.stockQuantity !== undefined ? data.stockQuantity : originalDoc?.stockQuantity
        const newSku = data?.sku !== undefined ? data.sku : originalDoc?.sku
        
        const isSkuZero = !newSku || newSku === '0' || String(newSku).trim() === '0' || String(newSku).trim().toLowerCase() === 'o'
        const shouldBeArchived = newStock === 0 || isSkuZero

        if (shouldBeArchived && originalStatus === 'active') {
          return {
            ...data,
            status: 'archived',
          }
        } else if (!shouldBeArchived && originalStatus === 'archived') {
          return {
            ...data,
            status: 'active',
          }
        }
        return data
      },
    ],
    afterRead: [
      async ({ doc, req }) => {
        // Admin reads should reflect stored DB values (dashboard source of truth).
        if (req?.user) return doc
        return resolveProductPricingForStorefrontAsync(doc, req)
      },
    ],
  },
}
