import config from '@payload-config'
import { getPayload } from 'payload'

const reelSelect = {
  id: true,
  platform: true,
  url: true,
  order: true,
  status: true,
} as const

export async function GET() {
  try {
    const payload = await getPayload({ config })

    const result = await payload.find({
      collection: 'reels',
      limit: 12,
      depth: 0,
      sort: 'order',
      where: {
        status: { equals: 'active' },
      },
      select: reelSelect,
    })

    return Response.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    })
  } catch (error) {
    console.error('[storefront/reels]', error)
    return Response.json({ error: 'Failed to load reels' }, { status: 500 })
  }
}
