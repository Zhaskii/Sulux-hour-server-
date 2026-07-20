import type { CollectionConfig } from 'payload'

import {
  canDeleteContent,
  canManageContent,
  canReadStaffData,
} from '../access/roles'
import type { Order } from '../payload-types'
import { sendOrderConfirmationEmails } from '../utilities/order-emails'

const orderStatuses = [
  { label: 'Pending Payment', value: 'pending_payment' },
  { label: 'COD Pending', value: 'cod_pending' },
  { label: 'Paid', value: 'paid' },
  { label: 'Cancelled', value: 'cancelled' },
  { label: 'Fulfilled', value: 'fulfilled' },
]

const paymentMethods = [
  { label: 'Cash on Delivery', value: 'cod' },
  { label: 'Pick from Store', value: 'pickup' },
  { label: 'Online Payment', value: 'online' },
]

export const Orders: CollectionConfig = {
  slug: 'orders',

  admin: {
    useAsTitle: 'orderNumber',
    defaultColumns: [
      'orderNumber',
      'status',
      'guestEmail',
      'guestFirstName',
      'guestLastName',
      'paymentMethod',
      'shippingCountry',
      'total',
      'createdAt',
    ],
  },

  access: {
    create: () => false,
    read: canReadStaffData,
    update: canManageContent,
    delete: canDeleteContent,
  },

  fields: [
    {
      name: 'orderNumber',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending_payment',
      options: orderStatuses,
    },
    {
      name: 'guestEmail',
      type: 'email',
      required: true,
    },
    {
      name: 'guestFirstName',
      type: 'text',
      required: true,
    },
    {
      name: 'guestLastName',
      type: 'text',
      required: true,
    },
    {
      name: 'guestPhone',
      type: 'text',
      required: true,
    },
    {
      name: 'shippingAddress',
      type: 'text',
      required: true,
    },
    {
      name: 'shippingApartment',
      type: 'text',
    },
    {
      name: 'shippingCity',
      type: 'text',
      required: true,
    },
    {
      name: 'shippingState',
      type: 'text',
      required: true,
    },
    {
      name: 'shippingCountry',
      type: 'text',
      required: true,
      admin: {
        description: 'ISO country code (e.g. NP, IN).',
      },
    },
    {
      name: 'shippingPostalCode',
      type: 'text',
    },
    {
      name: 'paymentMethod',
      type: 'select',
      required: true,
      options: paymentMethods,
    },
    {
      name: 'orderNotes',
      type: 'textarea',
      admin: {
        description: 'Delivery instructions from the customer.',
      },
    },
    {
      name: 'lineItems',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        {
          name: 'product',
          type: 'relationship',
          relationTo: 'products',
          required: true,
        },
        {
          name: 'productName',
          type: 'text',
          required: true,
        },
        {
          name: 'productSku',
          type: 'text',
          required: true,
        },
        {
          name: 'unitPrice',
          type: 'number',
          required: true,
          min: 0,
        },
        {
          name: 'quantity',
          type: 'number',
          required: true,
          min: 1,
        },
        {
          name: 'lineTotal',
          type: 'number',
          required: true,
          min: 0,
        },
      ],
    },
    {
      name: 'subtotal',
      type: 'number',
      required: true,
      min: 0,
    },
    {
      name: 'discount',
      type: 'number',
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'shippingCost',
      type: 'number',
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'total',
      type: 'number',
      required: true,
      min: 0,
    },
    {
      name: 'couponCode',
      type: 'text',
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'Optional — linked when the customer is signed in.',
      },
    },
  ],

  hooks: {
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation !== 'create') return doc

        void sendOrderConfirmationEmails(req.payload, doc as Order).catch((error) => {
          req.payload.logger.error({
            err: error,
            msg: `Failed to send order emails for ${(doc as Order).orderNumber}`,
          })
        })

        return doc
      },
    ],
  },
}
