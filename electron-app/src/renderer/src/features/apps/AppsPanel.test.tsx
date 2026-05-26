// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach } from 'vitest'
import { useState } from 'react'
import { I18nProvider } from '../../i18n'
import { useAppsPanel } from './AppsPanel'

function AppsTestWrapper() {
  const [apps, setApps] = useState([
    { id: '1', displayName: 'Terminal', bundleID: 'com.apple.Terminal', enabled: true, updatedAt: new Date().toISOString() }
  ])
  const [newAppName, setNewAppName] = useState('')
  const [newAppBundle, setNewAppBundle] = useState('')

  const panel = useAppsPanel({
    apps,
    filteredApps: apps,
    selectedAppId: '',
    setSelectedAppId: () => {},
    newAppName,
    setNewAppName,
    newAppBundle,
    setNewAppBundle,
    setApps
  })

  return (
    <div>
      {panel.center}
      {panel.selectedApp && (
        <div data-testid="detail">
          <span>{panel.selectedApp.displayName}</span>
        </div>
      )}
    </div>
  )
}

describe('AppsPanel', () => {
  afterEach(cleanup)

  it('renders app list', () => {
    render(
      <I18nProvider>
        <AppsTestWrapper />
      </I18nProvider>
    )
    expect(screen.getByText('Terminal')).toBeTruthy()
    expect(screen.getByText('com.apple.Terminal')).toBeTruthy()
  })

  it('shows empty state when no apps', () => {
    const EmptyWrapper = () => {
      const panel = useAppsPanel({
        apps: [],
        filteredApps: [],
        selectedAppId: '',
        setSelectedAppId: () => {},
        newAppName: '',
        setNewAppName: () => {},
        newAppBundle: '',
        setNewAppBundle: () => {},
        setApps: () => {}
      })
      return <div>{panel.center}</div>
    }

    render(
      <I18nProvider>
        <EmptyWrapper />
      </I18nProvider>
    )
    expect(screen.getByPlaceholderText('Display name')).toBeTruthy()
  })
})
