'use client'

import { GearIcon, Popup, useTranslation } from '@payloadcms/ui'
import type { ReactNode } from 'react'
import { Fragment } from 'react'

type SettingsMenuButtonProps = {
  settingsMenu: ReactNode[]
}

export const SettingsMenuButton = ({ settingsMenu }: SettingsMenuButtonProps) => {
  const { t } = useTranslation()

  if (!settingsMenu || settingsMenu.length === 0) {
    return null
  }

  return (
    <Popup
      button={<GearIcon ariaLabel={t('general:menu')} />}
      className="settings-menu-button"
      horizontalAlign="left"
      id="settings-menu"
      size="small"
      verticalAlign="bottom"
    >
      {settingsMenu.map((item, index) => (
        <Fragment key={`settings-menu-item-${index}`}>{item}</Fragment>
      ))}
    </Popup>
  )
}
