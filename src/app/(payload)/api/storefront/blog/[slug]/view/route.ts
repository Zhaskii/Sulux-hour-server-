import config from '@payload-config'
import { getPayload } from 'payload'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  if (!slug?.trim()) {
    return Response.json({ error: 'Slug is required' }, { status: 400 })
  }

  try {
    const payload = await getPayload({ config })

    const result = await payload.find({
      collection: 'posts',
      limit: 1,
      where: {
        and: [
          { slug: { equals: slug } },
          { status: { equals: 'published' } },
        ],
      },
      select: {
        id: true,
        viewCount: true,
      },
    })

    const post = result.docs[0]

    if (!post) {
      return Response.json({ error: 'Post not found' }, { status: 404 })
    }

    const viewCount = (post.viewCount ?? 0) + 1

    await payload.update({
      collection: 'posts',
      id: post.id,
      data: { viewCount },
    })

    return Response.json({ viewCount })
  } catch (error) {
    console.error('[storefront/blog/[slug]/view]', error)
    return Response.json({ error: 'Failed to record view' }, { status: 500 })
  }
}
