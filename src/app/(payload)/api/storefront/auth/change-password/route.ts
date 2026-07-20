import config from '@payload-config'
import {
  createPayloadRequest,
  getPayload,
  loginOperation,
} from 'payload'

type ChangePasswordBody = {
  currentPassword?: string
  newPassword?: string
}

export async function POST(request: Request) {
  let body: ChangePasswordBody

  try {
    body = (await request.json()) as ChangePasswordBody
  } catch {
    return Response.json({ message: 'Invalid request body' }, { status: 400 })
  }

  const { currentPassword, newPassword } = body

  if (!currentPassword || !newPassword) {
    return Response.json({ message: 'Current and new password are required' }, { status: 400 })
  }

  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    return Response.json(
      { message: 'New password must be at least 8 characters' },
      { status: 400 },
    )
  }

  const payload = await getPayload({ config })
  const req = await createPayloadRequest({ config, request })
  const { user } = await payload.auth({ headers: request.headers, req })

  if (!user) {
    return Response.json({ message: 'You must be signed in' }, { status: 401 })
  }

  const usersCollection = payload.collections.users

  try {
    const loginReq = await createPayloadRequest({ config, request })
    await loginOperation({
      collection: usersCollection,
      data: { email: user.email, password: currentPassword },
      req: loginReq,
    })
  } catch {
    return Response.json({ message: 'Current password is incorrect' }, { status: 401 })
  }

  try {
    const doc = await payload.update({
      collection: 'users',
      id: user.id,
      data: { password: newPassword },
      req,
      overrideAccess: true,
    })

    return Response.json({
      doc,
      message: 'Password updated successfully',
    })
  } catch {
    return Response.json({ message: 'Could not update password' }, { status: 500 })
  }
}
