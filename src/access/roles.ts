import type { Access, Payload } from 'payload'

/** Roles that can open the Payload admin panel */
export const STAFF_ROLES = ['admin', 'editor', 'viewer'] as const

export type StaffRole = (typeof STAFF_ROLES)[number]

export const ALL_ROLES = ['admin', 'editor', 'viewer', 'customer'] as const

export type UserRole = (typeof ALL_ROLES)[number]

type ReqUser = {
  id?: number | string
  role?: UserRole
  _verified?: boolean | null
}

type AccessArgs = { req: { user?: ReqUser | null; payload?: Payload } }

export const isAdmin = ({ req }: AccessArgs) => req.user?.role === 'admin'

export const isEditor = ({ req }: AccessArgs) => req.user?.role === 'editor'

export const isViewer = ({ req }: AccessArgs) => req.user?.role === 'viewer'

export const isCustomer = ({ req }: AccessArgs) => req.user?.role === 'customer'

/** Admin panel access: admin, editor, viewer — not customers */
export const isStaffMember = ({ req }: AccessArgs) =>
  Boolean(req.user?.role && STAFF_ROLES.includes(req.user.role as StaffRole))

/** Create / update catalog content (brands, categories, products, media) */
export const canManageContent: Access = ({ req }) => {
  const role = req.user?.role
  return role === 'admin' || role === 'editor'
}

/** Delete catalog content or sensitive records */
export const canDeleteContent: Access = ({ req }) => req.user?.role === 'admin'

/** Read staff-only data (e.g. contact submissions) */
export const canReadStaffData: Access = ({ req }) => isStaffMember({ req })

/** Public read for storefront */
export const publicRead: Access = () => true

/** First user bootstrap OR staff with verified email */
export const canAccessAdmin = async ({
  req,
}: AccessArgs): Promise<boolean> => {
  if (isStaffMember({ req })) {
    return Boolean(req.user?._verified)
  }

  if (!req.payload) {
    return false
  }

  const existingUsers = await req.payload.count({
    collection: 'users',
    overrideAccess: true,
  })

  return existingUsers.totalDocs === 0
}

/** Only admins manage users and assign roles */
export const canManageUsers: Access = ({ req }) => isAdmin({ req })

/** Public registration (no session) or admin creating users in panel */
export const canCreateUser: Access = ({ req }) => {
  if (!req.user) {
    return true
  }

  return isAdmin({ req })
}

/** Admins see all users; everyone else only themselves */
export const canReadUser: Access = ({ id, req }) => {
  if (isAdmin({ req })) {
    return true
  }

  if (!req.user) {
    return false
  }

  return {
    id: {
      equals: id || req.user.id,
    },
  }
}

/** Admins update anyone; others only their own profile (role field locked separately) */
export const canUpdateUser: Access = ({ id, req }) => {
  if (isAdmin({ req })) {
    return true
  }

  if (!req.user) {
    return false
  }

  return {
    id: {
      equals: id || req.user.id,
    },
  }
}
