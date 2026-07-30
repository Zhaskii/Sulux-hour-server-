import config from '@payload-config'
import { getPayload } from 'payload'

export async function POST(request: Request) {
  try {
    const payload = await getPayload({ config })
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return Response.json({ message: 'No file uploaded.' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const media = await payload.create({
      collection: 'media',
      overrideAccess: true,
      data: {
        alt: `Payment Proof - ${file.name}`,
        folder: 'general',
      },
      file: {
        data: buffer,
        name: file.name,
        mimetype: file.type,
        size: file.size,
      },
    })

    return Response.json({ id: media.id, url: media.url })
  } catch (error: any) {
    console.error('Error uploading payment proof:', error)
    return Response.json(
      { message: error?.message || 'Error uploading payment proof.' },
      { status: 500 },
    )
  }
}
