import { PREFERENCE_KEYS } from 'payload/shared'
import { cache } from 'react'

import type { PayloadRequest } from 'payload'

export const getNavPrefs = cache(async (req?: PayloadRequest) => {
  if (!req?.user?.collection) {
    return null
  }

  const result = await req.payload.find({
    collection: 'payload-preferences',
    depth: 0,
    limit: 1,
    pagination: false,
    req,
    where: {
      and: [
        {
          key: {
            equals: PREFERENCE_KEYS.NAV,
          },
        },
        {
          'user.relationTo': {
            equals: req.user.collection,
          },
        },
        {
          'user.value': {
            equals: req.user.id,
          },
        },
      ],
    },
  })

  return result.docs[0]?.value ?? null
})
