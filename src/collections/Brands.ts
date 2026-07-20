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
    },
 
}
