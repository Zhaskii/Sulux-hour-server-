import type { CollectionConfig } from 'payload'

import {
  canAccessAdmin,
  canCreateUser,
  canDeleteContent,
  canReadUser,
  canUpdateUser,
  type UserRole,
} from '../access/roles'
import {
  buildForgotPasswordEmailHTML,
  buildVerifyEmailHTML,
} from '../utilities/urls'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    description:
      'Customers register on the website. Only admins can create staff accounts and assign roles.',
  },
  access: {
    admin: canAccessAdmin,
    create: canCreateUser,
    delete: canDeleteContent,
    read: canReadUser,
    update: canUpdateUser,
  },
  auth: {
    cookies: {
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
      secure: process.env.NODE_ENV === 'production',
    },
    maxLoginAttempts: 5,
    lockTime: 1000 * 60 * 15,
    removeTokenFromResponses: true,
    tokenExpiration: 60 * 60 * 24 * 7,
    useSessions: true,
    verify: {
      generateEmailHTML: (args) =>
        buildVerifyEmailHTML({
          token: args?.token ?? '',
          user: {
            email: args?.user?.email ?? '',
            firstName: args?.user?.firstName ?? '',
          },
        }),
      generateEmailSubject: () => 'Verify your Sulux Centre account',
    },
    forgotPassword: {
      generateEmailHTML: (args) =>
        buildForgotPasswordEmailHTML({
          token: args?.token ?? '',
          user: {
            email: args?.user?.email ?? '',
            firstName: args?.user?.firstName ?? '',
          },
        }),
      generateEmailSubject: () => 'Reset your Sulux Centre password',
    },
  },
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
      name: 'phone',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'role',
      type: 'select',
      saveToJWT: true,
      defaultValue: 'customer',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Editor', value: 'editor' },
        { label: 'Viewer', value: 'viewer' },
        { label: 'Customer', value: 'customer' },
      ],
      required: true,
      access: {
        create: ({ req }) => req.user?.role === 'admin',
        update: ({ req }) => req.user?.role === 'admin',
      },
      admin: {
        description:
          'Admin: full control. Editor: manage content. Viewer: read-only admin. Customer: website only.',
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation, req }) => {
        if (operation !== 'create') {
          return data
        }

        const existingUsers = await req.payload.count({
          collection: 'users',
          overrideAccess: true,
        })

        if (existingUsers.totalDocs === 0) {
          return {
            ...data,
            role: 'admin' satisfies UserRole,
          }
        }

        if (!req.user || req.user.role !== 'admin') {
          return {
            ...data,
            role: 'customer' satisfies UserRole,
          }
        }

        return data
      },
    ],
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation !== 'create' || !req.user || req.user.role !== 'admin') {
          return doc
        }

        const role = doc.role as UserRole

        if (role === 'customer') {
          return doc
        }

        await req.payload.update({
          collection: 'users',
          id: doc.id,
          data: {
            _verified: true,
          },
          overrideAccess: true,
        })

        return doc
      },
    ],
  },
}
