import type { CollectionConfig } from 'payload'
import { lexicalEditor } from '@payloadcms/richtext-lexical'

import { catalogAccess } from '../access/collectionAccess'
import { formatSlug } from '../utilities/formatSlug'

const postStatuses = [
  { label: 'Draft', value: 'draft' },
  { label: 'Published', value: 'published' },
  { label: 'Archived', value: 'archived' },
] as const

export const Posts: CollectionConfig = {
  slug: 'posts',
  labels: {
    singular: 'Blog Post',
    plural: 'Blog Posts',
  },
  admin: {
    defaultColumns: ['title', 'status', 'viewCount', 'author', 'publishedAt', 'updatedAt'],
    useAsTitle: 'title',
    description: 'Blog articles for the Sulux Centre storefront.',
  },
  access: catalogAccess,
  defaultPopulate: {
    id: true,
    title: true,
    slug: true,
    excerpt: true,
    content: true,
    status: true,
    featuredImage: true,
    author: true,
    publishedAt: true,
    tags: true,
    isFeatured: true,
    readingTimeMinutes: true,
    viewCount: true,
    meta: true,
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Content',
          fields: [
            {
              name: 'title',
              type: 'text',
              required: true,
            },
            {
              name: 'slug',
              type: 'text',
              required: true,
              unique: true,
              admin: {
                description: 'URL-friendly post identifier, e.g. luxury-watch-care-tips.',
              },
            },
            {
              name: 'status',
              type: 'select',
              defaultValue: 'draft',
              options: [...postStatuses],
              required: true,
            },
            {
              name: 'excerpt',
              type: 'textarea',
              required: true,
              admin: {
                description:
                  'Short summary shown on blog cards and used as the default SEO description.',
              },
            },
            {
              name: 'content',
              type: 'richText',
              label: 'Body',
              required: true,
              editor: lexicalEditor(),
              admin: {
                description: 'Main article content (Lexical rich text).',
              },
            },
            {
              name: 'author',
              type: 'text',
              defaultValue: 'Sulux Centre',
              admin: {
                readOnly: true,
                description: 'Author credited on the post.',
              },
            },
            {
              name: 'publishedAt',
              type: 'date',
              admin: {
                date: {
                  pickerAppearance: 'dayAndTime',
                },
                description: 'Publication date. Auto-set when status changes to Published.',
              },
            },
            {
              name: 'readingTimeMinutes',
              type: 'number',
              min: 1,
              admin: {
                description: 'Estimated reading time in minutes.',
              },
            },
            {
              name: 'viewCount',
              type: 'number',
              defaultValue: 0,
              min: 0,
              admin: {
                readOnly: true,
                description: 'Total storefront page views for this article.',
              },
            },
            {
              name: 'tags',
              type: 'array',
              labels: {
                singular: 'Tag',
                plural: 'Tags',
              },
              fields: [
                {
                  name: 'tag',
                  type: 'text',
                  required: true,
                },
              ],
            },
            {
              name: 'isFeatured',
              type: 'checkbox',
              defaultValue: false,
              admin: {
                description: 'Highlight this post on the blog homepage.',
              },
            },
          ],
        },
        {
          label: 'Media',
          fields: [
            {
              name: 'featuredImage',
              type: 'upload',
              relationTo: 'media',
              admin: {
                description: 'Hero image for the post and default social share image.',
              },
              filterOptions: {
                folder: { equals: 'blog' },
              },
            },
            {
              name: 'gallery',
              type: 'array',
              labels: {
                singular: 'Image',
                plural: 'Gallery',
              },
              fields: [
                {
                  name: 'image',
                  type: 'upload',
                  relationTo: 'media',
                  required: true,
                  filterOptions: {
                    folder: { equals: 'blog' },
                  },
                },
                {
                  name: 'caption',
                  type: 'text',
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
      ({ data }) => {
        if (!data?.title) {
          return data
        }

        return {
          ...data,
          slug: formatSlug(data.slug || data.title),
        }
      },
    ],
    beforeChange: [
      ({ data, originalDoc }) => {
        const next = {
          ...data,
          author: 'Sulux Centre',
        } as typeof data & { author: string }

        if (next?.status === 'published' && !next?.publishedAt && !originalDoc?.publishedAt) {
          return {
            ...next,
            publishedAt: new Date().toISOString(),
          }
        }

        return next
      },
    ],
  },
}
