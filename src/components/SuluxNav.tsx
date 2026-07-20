import { Logout } from '@payloadcms/ui'
import { RenderServerComponent } from '@payloadcms/ui/elements/RenderServerComponent'
import { EntityType, type EntityToGroup, groupNavItems } from '@payloadcms/ui/shared'
import type { PayloadRequest, ServerProps } from 'payload'
import React from 'react'

import { getNavPrefs } from '../utilities/getNavPrefs'
import SuluxNavClient from './SuluxNavClient'
import { NavHamburger } from './nav/NavHamburger'
import { NavWrapper } from './nav/NavWrapper'
import { SettingsMenuButton } from './nav/SettingsMenuButton'

const baseClass = 'nav'

type SuluxNavProps = ServerProps & {
  req?: PayloadRequest
}

const SuluxNav = async (props: SuluxNavProps) => {
  const {
    documentSubViewType,
    i18n,
    locale,
    params,
    payload,
    permissions,
    req,
    searchParams,
    user,
    viewType,
    visibleEntities,
  } = props

  if (!payload?.config) {
    return null
  }

  const {
    admin: {
      components: {
        afterNav,
        afterNavLinks,
        beforeNav,
        beforeNavLinks,
        logout,
        settingsMenu,
      },
    },
    collections,
    globals,
  } = payload.config

  const groups = groupNavItems(
    [
      ...collections
        .filter(({ slug }) => visibleEntities?.collections.includes(slug))
        .map((collection) => ({
          type: EntityType.collection,
          entity: collection,
        })),
      ...globals
        .filter(({ slug }) => visibleEntities?.globals.includes(slug))
        .map((global) => ({
          type: EntityType.global,
          entity: global,
        })),
    ] as EntityToGroup[],
    permissions!,
    i18n,
  )

  const navPreferences = await getNavPrefs(req)

  const serverProps = {
    i18n,
    locale,
    params,
    payload,
    permissions,
    searchParams,
    user,
  }

  const LogoutComponent = RenderServerComponent({
    clientProps: {
      documentSubViewType,
      viewType,
    },
    Component: logout?.Button,
    Fallback: Logout,
    importMap: payload.importMap,
    serverProps,
  })

  const RenderedSettingsMenu =
    settingsMenu && Array.isArray(settingsMenu)
      ? settingsMenu.map((item, index) =>
          RenderServerComponent({
            clientProps: {
              documentSubViewType,
              viewType,
            },
            Component: item,
            importMap: payload.importMap,
            key: `settings-menu-item-${index}`,
            serverProps,
          }),
        )
      : []

  const RenderedBeforeNav = RenderServerComponent({
    clientProps: {
      documentSubViewType,
      viewType,
    },
    Component: beforeNav,
    importMap: payload.importMap,
    serverProps,
  })

  const RenderedBeforeNavLinks = RenderServerComponent({
    clientProps: {
      documentSubViewType,
      viewType,
    },
    Component: beforeNavLinks,
    importMap: payload.importMap,
    serverProps,
  })

  const RenderedAfterNavLinks = RenderServerComponent({
    clientProps: {
      documentSubViewType,
      viewType,
    },
    Component: afterNavLinks,
    importMap: payload.importMap,
    serverProps,
  })

  const RenderedAfterNav = RenderServerComponent({
    clientProps: {
      documentSubViewType,
      viewType,
    },
    Component: afterNav,
    importMap: payload.importMap,
    serverProps,
  })

  return (
    <NavWrapper baseClass={baseClass}>
      {RenderedBeforeNav}
      <nav className={`${baseClass}__wrap`}>
        {RenderedBeforeNavLinks}
        <SuluxNavClient
          groups={groups}
          navPreferences={
            navPreferences as {
              groups?: Record<string, { open?: boolean }>
            } | null
          }
        />
        {RenderedAfterNavLinks}
        <div className={`${baseClass}__controls`}>
          <SettingsMenuButton settingsMenu={RenderedSettingsMenu} />
          {LogoutComponent}
        </div>
      </nav>
      {RenderedAfterNav}
      <div className={`${baseClass}__header`}>
        <div className={`${baseClass}__header-content`}>
          <NavHamburger baseClass={baseClass} />
        </div>
      </div>
    </NavWrapper>
  )
}

export default SuluxNav
