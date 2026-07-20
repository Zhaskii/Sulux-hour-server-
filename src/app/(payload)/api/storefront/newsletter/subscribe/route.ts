import config from '@payload-config'
import { getPayload } from 'payload'

type SubscribeBody = {
  email?: unknown
  source?: unknown
}

function normalizeEmail(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim().toLowerCase()
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function parseSource(value: unknown): 'footer' | 'other' {
  return value === 'other' ? 'other' : 'footer'
}

export async function POST(request: Request) {
  let body: SubscribeBody

  try {
    body = (await request.json()) as SubscribeBody
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const email = normalizeEmail(body.email)
  if (!email || !isValidEmail(email)) {
    return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }

  const source = parseSource(body.source)

  try {
    const payload = await getPayload({ config })

    const existing = await payload.find({
      collection: 'newsletter',
      where: { email: { equals: email } },
      limit: 1,
      overrideAccess: true,
    })

    const prior = existing.docs[0]

    if (prior) {
      if (prior.status === 'active') {
        return Response.json({
          message: 'You are already subscribed.',
          alreadySubscribed: true,
          subscriber: prior,
        })
      }

      const reactivated = await payload.update({
        collection: 'newsletter',
        id: prior.id,
        data: {
          status: 'active',
          source,
        },
        overrideAccess: true,
      })

      return Response.json({
        message: 'Subscription confirmed.',
        reactivated: true,
        subscriber: reactivated,
      })
    }

    const subscriber = await payload.create({
      collection: 'newsletter',
      data: {
        email,
        status: 'active',
        source,
      },
      overrideAccess: true,
    })

    return Response.json(
      {
        message: 'Subscription confirmed.',
        subscriber,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('Newsletter subscribe failed:', error)
    return Response.json(
      { error: 'Unable to subscribe right now. Please try again shortly.' },
      { status: 500 },
    )
  }
}
