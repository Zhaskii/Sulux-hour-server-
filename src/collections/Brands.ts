import type { CollectionConfig } from 'payload'

import { catalogAccess } from '../access/collectionAccess'
import { formatSlug } from '../utilities/formatSlug'


export const Brands: CollectionConfig = {
  slug: 'brands',
  admin: {
    defaultColumns: ['name', 'slug', 'isActive', 'updatedAt'],
    useAsTitle: 'name',
  },
  access: catalogAccess,
  defaultPopulate: {
    id: true,
    name: true,
    slug: true,
    tagline: true,
    description: true,
    heroMedia: true,
    meta: true,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'URL-friendly brand identifier,eg:rolex or casio.',
      },
    },
    {
      name: 'order_index',
      type: 'number',
      required: false,
      defaultValue: 0,
    },
    {
      name: 'tagline',
      type: 'text',
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'heroMedia',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Main brand hero media for storefront (image or video).',
      },
      filterOptions: {
        folder: { equals: 'brands' },
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'discountPercentage',
      type: 'number',
      min: 0,
      max: 100,
      defaultValue: 0,
      admin: {
        description: 'Default discount percentage for all products of this brand.',
      },
    },
  ],
  hooks: {
    beforeValidate: [
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
    afterChange: [
      async ({ doc, req }) => {
        const brandId = doc.id
        const brandDiscount = doc.discountPercentage ?? 0

        // Set flag in transaction request context to bypass categories validation on sync updates
        req.context.skipProductCategoriesValidation = true

        // Find all products of this brand (using a large limit to avoid default pagination capping)
        const products = await req.payload.find({
          collection: 'products',
          where: {
            brand: { equals: brandId },
          },
          limit: 1000,
          depth: 0,
          req,
          overrideAccess: true,
        })

        console.log(`[brand-afterChange] Found ${products.docs.length} products for brand ${doc.name} (ID: ${brandId})`)

        for (const product of products.docs) {
          console.log(`[brand-afterChange] Product: ${product.slug}, Current discountPercentage: ${product.discountPercentage}, Brand discount: ${brandDiscount}`)
          if (product.discountPercentage !== brandDiscount) {
            console.log(`[brand-afterChange] Updating product ${product.slug} to discount ${brandDiscount}`)
            try {
              const updatedProduct = await req.payload.update({
                collection: 'products',
                id: product.id,
                data: {
                  discountPercentage: brandDiscount,
                },
                req,
                overrideAccess: true,
              })
              console.log(`[brand-afterChange] Update success for ${product.slug}. New price: ${updatedProduct.price}, discount: ${updatedProduct.discountPercentage}`)
            } catch (err: any) {
              console.error(`[brand-afterChange] Update failed for ${product.slug}:`, err.message || err)
            }
          }
        }
      },
    ],
  },
}
