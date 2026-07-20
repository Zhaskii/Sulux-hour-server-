'use client'

import { BrowseByFolderButton, Link, NavGroup, useConfig, useTranslation } from '@payloadcms/ui'
import { EntityType, type NavGroupType } from '@payloadcms/ui/shared'
import { usePathname } from 'next/navigation'
import type { StaticLabel } from 'payload'
import { formatAdminURL } from 'payload/shared'
import React, { Fragment } from 'react'

import NavIcon from './NavIcon'

const baseClass = 'nav'

const getLabel = (
  label: StaticLabel,
  i18n: {
    language: string
    t: (key: string, options?: Record<string, unknown>) => string
  },
): string => {
  if (typeof label === 'string') {
    return label
  }

  if (typeof label === 'function') {
    const labelFn = label as (args: {
      i18n: typeof i18n
      t: typeof i18n.t
    }) => string

    return labelFn({ i18n, t: i18n.t })
  }

  if (label && typeof label === 'object') {
    const record = label as Record<string, string>

    return record[i18n.language] ?? record.en ?? Object.values(record)[0] ?? ''
  }

  return ''
}

type SuluxNavClientProps = {
  groups: NavGroupType[]
  navPreferences?: {
    groups?: Record<string, { open?: boolean }>
  } | null
}

const SuluxNavClient = ({ groups, navPreferences }: SuluxNavClientProps) => {
  const pathname = usePathname()
  const {
    config: {
      admin: {
        routes: { browseByFolder: foldersRoute },
      },
      folders,
      routes: { admin: adminRoute },
    },
  } = useConfig()
  const { i18n } = useTranslation()

  const folderURL = formatAdminURL({
    adminRoute,
    path: foldersRoute,
  })
  const viewingRootFolderView = pathname.startsWith(folderURL)
  const dashboardHref = formatAdminURL({
    adminRoute,
    path: '/',
  })
  const isDashboardActive = pathname === dashboardHref

  const dashboardLink = (
    <Fragment>
      {isDashboardActive ? <div className={`${baseClass}__link-indicator`} /> : null}
      <span className={`${baseClass}__link-icon`} aria-hidden="true">
        <NavIcon slug="dashboard" />
      </span>
      <span className={`${baseClass}__link-label`}>Dashboard</span>
    </Fragment>
  )

  return (
    <Fragment>
      {isDashboardActive ? (
        <div className={`${baseClass}__link`} id="nav-dashboard">
          {dashboardLink}
        </div>
      ) : (
        <Link
          className={`${baseClass}__link`}
          href={dashboardHref}
          id="nav-dashboard"
          prefetch={false}
        >
          {dashboardLink}
        </Link>
      )}

      {typeof folders === 'object' && folders?.browseByFolder ? (
        <BrowseByFolderButton active={viewingRootFolderView} />
      ) : null}

      {groups.map((group, groupIndex) => (
        <NavGroup
          isOpen={navPreferences?.groups?.[group.label]?.open}
          key={group.label ?? groupIndex}
          label={group.label}
        >
          {group.entities.map((entity, entityIndex) => {
            const { slug, type, label } = entity

            let href = ''
            let id = ''

            if (type === EntityType.collection) {
              href = formatAdminURL({
                adminRoute,
                path: `/collections/${slug}`,
              })
              id = `nav-${slug}`
            }

            if (type === EntityType.global) {
              href = formatAdminURL({
                adminRoute,
                path: `/globals/${slug}`,
              })
              id = `nav-global-${slug}`
            }

            const isActive =
              pathname.startsWith(href) && ['/', undefined].includes(pathname[href.length])

            const linkContent = (
              <Fragment>
                {isActive ? <div className={`${baseClass}__link-indicator`} /> : null}
                <span className={`${baseClass}__link-icon`} aria-hidden="true">
                  <NavIcon slug={slug} />
                </span>
                <span className={`${baseClass}__link-label`}>
                  {getLabel(label, i18n as Parameters<typeof getLabel>[1])}
                </span>
              </Fragment>
            )

            if (pathname === href) {
              return (
                <div className={`${baseClass}__link`} id={id} key={id ?? entityIndex}>
                  {linkContent}
                </div>
              )
            }

            return (
              <Link
                className={`${baseClass}__link`}
                href={href}
                id={id}
                key={id ?? entityIndex}
                prefetch={false}
              >
                {linkContent}
              </Link>
            )
          })}
        </NavGroup>
      ))}
    </Fragment>
  )
}

export default SuluxNavClient
