import {
  canDeleteContent,
  canManageContent,
  canReadStaffData,
  publicRead,
} from './roles'

/** Storefront catalog collections (brands, categories, products, media) */
export const catalogAccess = {
  create: canManageContent,
  read: publicRead,
  update: canManageContent,
  delete: canDeleteContent,
}

/** Contact form submissions */
export const contactsAccess = {
  create: () => true,
  read: canReadStaffData,
  update: canManageContent,
  delete: canDeleteContent,
}
