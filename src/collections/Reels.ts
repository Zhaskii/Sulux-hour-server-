import type { CollectionConfig } from 'payload'

export const Reels: CollectionConfig = {
  slug: 'reels',
  admin: {
    useAsTitle: 'url',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'platform',
      type: 'select',
      required: true,
      options: [{ label: 'Instagram', value: 'instagram' }],
    },
    {
      name: 'url',
      type: 'text',
      required: true,
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 1,
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
      ],
      defaultValue: 'active',
    },
  ],
}
