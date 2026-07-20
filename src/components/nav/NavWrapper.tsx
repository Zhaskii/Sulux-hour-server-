'use client'

import { useNav } from '@payloadcms/ui'
import type { ReactNode } from 'react'

type NavWrapperProps = {
  baseClass: string
  children: ReactNode
}

export const NavWrapper = ({ baseClass, children }: NavWrapperProps) => {
  const { hydrated, navOpen, navRef, shouldAnimate } = useNav()

  const className = [baseClass, navOpen && `${baseClass}--nav-open`, shouldAnimate && `${baseClass}--nav-animate`, hydrated && `${baseClass}--nav-hydrated`]
    .filter(Boolean)
    .join(' ')

  return (
    <aside className={className} inert={!navOpen ? true : undefined}>
      <div className={`${baseClass}__scroll`} ref={navRef}>
        {children}
      </div>
    </aside>
  )
}
