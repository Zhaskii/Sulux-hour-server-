import type { Field } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { s3Storage } from '@payloadcms/storage-s3'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Contacts } from './collections/Contacts'
import { Newsletter } from './collections/Newsletter'
import { Brands } from './collections/Brands'
import { Categories } from './collections/Categories'
import { Products } from './collections/Products'
import { Posts } from './collections/Posts'
import { Orders } from './collections/Orders'
import { parseAllowedOrigins } from './utilities/parseAllowedOrigins'
import { getPayloadServerURL, getStorefrontURL } from './utilities/urls'
import { Reels } from './collections/Reels'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const serverURL = getPayloadServerURL()
const storefrontURL = getStorefrontURL()
const allowedOrigins = [
  ...new Set([serverURL, storefrontURL, ...parseAllowedOrigins(process.env.CORS_ORIGIN)]),
]

const seoExtraFields: Field[] = [
  {
    name: 'keywords',
    type: 'text',
    label: 'Meta Keywords',
    admin: {
      description: 'Comma-separated keywords for search engines.',
    },
  },
  {
    name: 'canonicalURL',
    type: 'text',
    label: 'Canonical URL',
    admin: {
      description: 'Leave empty to use the default page URL.',
    },
  },
  {
    name: 'robots',
    type: 'select',
    label: 'Robots',
    defaultValue: 'index,follow',
    options: [
      { label: 'Index, Follow', value: 'index,follow' },
      { label: 'No Index, No Follow', value: 'noindex,nofollow' },
      { label: 'No Index, Follow', value: 'noindex,follow' },
    ],
  },
]

function withoutSeoImageAndPreview(defaultFields: Field[]): Field[] {
  return defaultFields.filter(
    (field) => !('name' in field) || (field.name !== 'preview' && field.name !== 'image'),
  )
}

const SEO_DESCRIPTION_LIMITS = {
  minLength: 100,
  maxLength: 160,
} as const

function withSeoDescriptionMaxLength(defaultFields: Field[]): Field[] {
  return defaultFields.map((field) => {
    if (!('name' in field)) return field

    if (field.name === 'description') {
      return { ...field, ...SEO_DESCRIPTION_LIMITS }
    }

    if (field.name === 'overview' && field.type === 'ui') {
      const fieldConfig = field.admin?.components?.Field
      if (!fieldConfig || typeof fieldConfig !== 'object') return field

      return {
        ...field,
        admin: {
          ...field.admin,
          components: {
            ...field.admin?.components,
            Field: {
              ...fieldConfig,
              clientProps: {
                ...('clientProps' in fieldConfig ? fieldConfig.clientProps : {}),
                descriptionOverrides: SEO_DESCRIPTION_LIMITS,
              },
            },
          },
        },
      }
    }

    return field
  })
}

export default buildConfig({
  serverURL,
  cookiePrefix: 'payload',
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: ' — Sulux Centre',
      description: 'Premium quality watches — Sulux Centre admin',
      icons: [
        {
          rel: 'icon',
          type: 'image/png',
          url: '/logo.png',
        },
      ],
    },
    components: {
      views: {
        dashboard: {
          Component: '../src/components/SuluxDashboard.tsx',
        },
      },
      graphics: {
        Icon: '../src/components/Icon.tsx',
        Logo: '../src/components/Logo.tsx',
      },
      Nav: '../src/components/SuluxNav.tsx',
    },
  },

  collections: [
    Orders,
    Products,
    Brands,
    Categories,
    Posts,
    Media,
    Contacts,
    Newsletter,
    Users,
    Reels,
  ],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
    // Never auto-push schema in dev against shared/prod DBs — use `pnpm migrate` instead.
    push: false,
  }),
  email: nodemailerAdapter({
    defaultFromAddress: 'contact@arkshfood.com',
    defaultFromName: 'SULUX CENTRE',
    transportOptions: {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    },
  }),
  cors: allowedOrigins,
  csrf: allowedOrigins,
  sharp,
  plugins: [
    seoPlugin({
      collections: ['products', 'posts'],

      uploadsCollection: 'media',

      generateTitle: ({ doc, collectionSlug }) => {
        if (collectionSlug === 'posts') {
          return doc?.meta?.title || doc?.title
        }

        return doc?.meta?.title || doc?.name || doc?.title
      },

      generateDescription: ({ doc, collectionSlug }) => {
        if (collectionSlug === 'posts') {
          return doc?.meta?.description || doc?.excerpt
        }

        return doc?.meta?.description || doc?.shortDescription || doc?.description
      },

      generateURL: ({ doc, collectionSlug }) => {
        if (collectionSlug === 'posts') {
          return `${storefrontURL}/blog/${doc?.slug}`
        }

        return `${storefrontURL}/product-detail/${doc?.slug}`
      },

      generateImage: ({ doc, collectionSlug }) => {
        if (collectionSlug === 'posts') {
          return doc?.meta?.image || doc?.featuredImage
        }

        return doc?.meta?.image || doc?.featuredImage
      },

      fields: ({ defaultFields }) => [
        ...withSeoDescriptionMaxLength(defaultFields),
        ...seoExtraFields,
      ],

      tabbedUI: true,
    }),
    seoPlugin({
      collections: ['brands', 'categories'],

      generateTitle: ({ doc }) => doc?.meta?.title || doc?.name,

      generateDescription: ({ doc }) => doc?.meta?.description || doc?.description || doc?.tagline,

      generateURL: ({ doc }) => `${storefrontURL}/shop/${doc?.slug}`,

      fields: ({ defaultFields }) => [
        ...withSeoDescriptionMaxLength(withoutSeoImageAndPreview(defaultFields)),
        ...seoExtraFields,
      ],

      tabbedUI: true,
    }),
    s3Storage({
      collections: {
        media: {
          disablePayloadAccessControl: true,
        },
      },
      bucket: process.env.MINIO_BUCKET!,
      config: {
        endpoint: process.env.MINIO_ENDPOINT!,
        region: process.env.MINIO_REGION!,
        credentials: {
          accessKeyId: process.env.MINIO_ACCESS_KEY_ID!,
          secretAccessKey: process.env.MINIO_SECRET_ACCESS_KEY!,
        },
        forcePathStyle: true,
      },
    }),
  ],
})
