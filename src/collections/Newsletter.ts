import type { CollectionConfig } from 'payload'

import { canDeleteContent, canManageContent, canReadStaffData } from '../access/roles'

type NewsletterDoc = {
  email: string
  status?: 'active' | 'unsubscribed'
}

const normalizeEmail = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  const email = value.trim().toLowerCase()
  return email.length > 0 ? email : undefined
}

export const newsletterAccess = {
  create: ({ req }: { req: { user?: unknown } }) => Boolean(req.user),
  read: canReadStaffData,
  update: canManageContent,
  delete: canDeleteContent,
}

export const Newsletter: CollectionConfig = {
  slug: 'newsletter',
  labels: {
    singular: 'Newsletter Subscriber',
    plural: 'Newsletter Subscribers',
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'status', 'source', 'createdAt'],
  },
  access: newsletterAccess,
  fields: [
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Unsubscribed', value: 'unsubscribed' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'source',
      type: 'select',
      defaultValue: 'footer',
      options: [
        { label: 'Footer', value: 'footer' },
        { label: 'Other', value: 'other' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data || typeof data !== 'object') return data

        const email = normalizeEmail(data.email)
        if (email) {
          data.email = email
        }

        return data
      },
    ],
    afterChange: [
      async ({ doc, operation, previousDoc, req }) => {
        const subscriber = doc as NewsletterDoc
        if (!subscriber.email) {
          return doc
        }

        const isNewSubscription =
          operation === 'create' ||
          (operation === 'update' &&
            previousDoc?.status === 'unsubscribed' &&
            subscriber.status === 'active')

        if (!isNewSubscription) {
          return doc
        }

        try {
          await req.payload.sendEmail({
            to: subscriber.email,
            subject: 'Welcome to SULUX CENTRE',
            text: `Thank you for subscribing to the SULUX CENTRE newsletter.

You'll now receive updates on our latest collections, exclusive offers, and news.

Regards,
SULUX CENTRE`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <h2 style="color: #111; margin-bottom: 20px;">Welcome to SULUX CENTRE</h2>
                <p>Thank you for subscribing to our newsletter.</p>
                <p>You'll now receive updates on our latest collections, exclusive offers, and news.</p>
                <p style="margin-top: 32px;">
                  Regards,<br>
                  <strong>SULUX CENTRE</strong>
                </p>
              </div>
            `,
          })
        } catch (error) {
          req.payload.logger.error({
            err: error,
            msg: `Failed to send newsletter welcome email to ${subscriber.email}`,
          })
        }

        return doc
      },
    ],
  },
}
