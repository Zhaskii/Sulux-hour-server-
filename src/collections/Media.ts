import type { CollectionConfig } from 'payload'

import { catalogAccess } from '../access/collectionAccess'

export const Media: CollectionConfig = {
  slug: 'media',
  access: catalogAccess,
  defaultPopulate: {
    id: true,
    alt: true,
    url: true,
    mimeType: true,
    filename: true,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
     {
      name: 'folder',
      type: 'select',
      required: true,
      defaultValue: 'general',

      options: [
        {
          label: 'Brands',
          value: 'brands',
        },

        {
          label: 'Products',
          value: 'products',
        },

        {
          label: 'Categories',
          value: 'categories',
        },

        {
          label: 'Blog',
          value: 'blog',
        },

        {
          label: 'General',
          value: 'general',
        },
      ],
    },
  ],
  upload: true,
}
