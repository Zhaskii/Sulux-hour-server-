import config from '@payload-config'
import { getPayload } from 'payload'

import { postContentToHtml } from '@/utilities/postContentToHtml'

const postSelect = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  status: true,
  content: true,
  featuredImage: true,
  author: true,
  publishedAt: true,
  readingTimeMinutes: true,
  viewCount: true,
  tags: true,
  isFeatured: true,
  gallery: true,
  meta: true,
  createdAt: true,
  updatedAt: true,
} as const

export async function GET(
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
      depth: 2,
      where: {
        and: [
          { slug: { equals: slug } },
          { status: { equals: 'published' } },
        ],
      },
      select: postSelect,
    })

    const post = result.docs[0]

    if (!post) {
      return Response.json({ error: 'Post not found' }, { status: 404 })
    }

    return Response.json(
      {
        post,
        contentHtml: postContentToHtml(post.content),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      },
    )
  } catch (error) {
    console.error('[storefront/blog/[slug]]', error)
    return Response.json({ error: 'Failed to load blog post' }, { status: 500 })
  }
}
