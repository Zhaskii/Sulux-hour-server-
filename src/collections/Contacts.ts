import type { CollectionConfig } from 'payload'

type ContactDoc = {
  email?: string
  enquiryType?: string
  firstName?: string
  lastName?: string
  message?: string
}

import { contactsAccess } from '../access/collectionAccess'

const escapeHTML = (value = '') =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

export const Contacts: CollectionConfig = {
  slug: 'contacts',
  admin: {
    defaultColumns: ['firstName', 'lastName', 'email', 'phone', 'enquiryType', 'createdAt'],
    useAsTitle: 'email',
  },
  access: contactsAccess,
  fields: [
    {
      name: 'firstName',
      type: 'text',
      required: true,
    },
    {
      name: 'lastName',
      type: 'text',
      required: true,
    },
    {
      name: 'email',
      type: 'email',
      required: true,
    },
    {
      name: 'phone',
      type: 'text',
      required: true,
    },
    {
      name: 'enquiryType',
      type: 'text',
      required: true,
    },
    {
      name: 'brand',
      type: 'text',
      required: true,
    },
    {
      name: 'message',
      type: 'textarea',
      required: true,
    },
  ],
  hooks: {
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation !== 'create') {
          return doc
        }

        const contact = doc as ContactDoc

        if (!contact.email) {
          return doc
        }

        const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(' ')
        const greetingName = escapeHTML(contact.firstName || fullName || 'there')

        try {
          await req.payload.sendEmail({
            to: contact.email,
            subject: 'Thanks for contacting SULUX CENTRE',
            text: `Hi ${contact.firstName || fullName || 'there'},\n\nThank you for contacting SULUX CENTRE. We have received your enquiry and our team will get back to you soon.\n\nRegards,\nSULUX CENTRE`,
            html: `
              <p>Hi ${greetingName},</p>
              <p>Thank you for contacting <strong>SULUX CENTRE</strong>. We have received your enquiry and our team will get back to you soon.</p>
              <p>Regards,<br />SULUX CENTRE</p>
            `,
          })
        } catch (error) {
          req.payload.logger.error({
            err: error,
            msg: `Failed to send contact confirmation email to ${contact.email}`,
          })
        }

        return doc
      },
    ],
  },
}
