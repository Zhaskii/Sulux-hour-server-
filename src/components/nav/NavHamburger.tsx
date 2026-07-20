'use client'

import { Hamburger, useNav } from '@payloadcms/ui'

type NavHamburgerProps = {
  baseClass: string
}

export const NavHamburger = ({ baseClass }: NavHamburgerProps) => {
  const { navOpen, setNavOpen } = useNav()

  return (
    <button
      className={`${baseClass}__mobile-close`}
      onClick={() => setNavOpen(false)}
      tabIndex={!navOpen ? -1 : undefined}
      type="button"
    >
      <Hamburger isActive />
    </button>
  )
}
