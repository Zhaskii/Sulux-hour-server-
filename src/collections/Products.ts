


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
    defaultColumns: [
      'name',
      'brand',
      'price',
      'stockQuantity',
      'status',
      'updatedAt',
    ],

    useAsTitle: 'name',
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
              required: true,
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
                description: 'Discount off original price. e.g. 10 = 10% off.',
              },
            },

            {
              name: 'price',
              type: 'number',
              min: 0,
              required: true,
              admin: {
                readOnly: true,
                description:
                  'Selling price (auto-calculated from original price minus discount).',
              },
            },

            {
              name: 'compareAtPrice',
              type: 'number',
              min: 0,
              admin: {
                readOnly: true,
                description:
                  'Auto-set to original price when a discount is applied (shown as strikethrough on storefront).',
              },
            },

            {
              name: 'sku',
              type: 'text',
              required: true,
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
                description:
                  'Homepage showcase buckets (e.g. featured, best-seller, top-seller).',
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
    },},
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

  hooks: {
    beforeValidate: [
      async ({ data, originalDoc, req }) =>
        applyBrandDiscountIfConfigured(data, originalDoc, req),
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