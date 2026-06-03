// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach } from 'vitest'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { I18nProvider } from '../../i18n'
import { useAppsPanel } from './AppsPanel'

vi.mock('../../i18n', () => ({
  I18nProvider: ({ children }: { children: ReactNode }) => children,
  useI18n: () => ({
    t: (key: string) =>
      ({
        'apps.displayName': 'Display name',
        'apps.bundleId': 'Bundle ID (com.apple.Terminal)',
        'apps.addApp': 'Add App',
        'apps.noApps': 'No apps yet',
        'secrets.enabled': 'Enabled',
      })[key] ?? key,
  }),
}))

function AppsTestWrapper(props: Partial<Parameters<typeof useAppsPanel>[0]> = {}) {
  const [apps, setApps] = useState([
    { id: '1', displayName: 'Terminal', bundleID: 'com.apple.Terminal', enabled: true, updatedAt: new Date().toISOString() }
  ])
  const [newAppName, setNewAppName] = useState('')
  const [newAppBundle, setNewAppBundle] = useState('')

  const panel = useAppsPanel({
    apps: props.apps ?? apps,
    filteredApps: props.filteredApps ?? apps,
    selectedAppId: props.selectedAppId ?? '',
    setSelectedAppId: props.setSelectedAppId ?? (() => {}),
    newAppName: props.newAppName ?? newAppName,
    setNewAppName: props.setNewAppName ?? setNewAppName,
    newAppBundle: props.newAppBundle ?? newAppBundle,
    setNewAppBundle: props.setNewAppBundle ?? setNewAppBundle,
    setApps: props.setApps ?? setApps
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

  beforeEach(() => {
    // @ts-expect-error mock
    window.brover = {}
  })

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
    render(
      <I18nProvider>
        <AppsTestWrapper apps={[]} filteredApps={[]} />
      </I18nProvider>
    )
    expect(screen.getByText(/no apps/i)).toBeTruthy()
  })

  it('shows empty state when filter returns no results but apps exist', () => {
    render(
      <I18nProvider>
        <AppsTestWrapper filteredApps={[]} />
      </I18nProvider>
    )
    expect(screen.getByText(/no apps/i)).toBeTruthy()
  })

  it('calls createApp with inputs and clears form', async () => {
    const createApp = vi.fn().mockResolvedValue([
      { id: '1', displayName: 'Terminal', bundleID: 'com.apple.Terminal', enabled: true, updatedAt: new Date().toISOString() },
      { id: '2', displayName: 'VSCode', bundleID: 'com.microsoft.VSCode', enabled: true, updatedAt: new Date().toISOString() }
    ])
    const setApps = vi.fn()
    // @ts-expect-error mock
    window.brover = { createApp }

    render(
      <I18nProvider>
        <AppsTestWrapper setApps={setApps} />
      </I18nProvider>
    )

    fireEvent.change(screen.getByPlaceholderText('Display name'), { target: { value: 'VSCode' } })
    fireEvent.change(screen.getByPlaceholderText('Bundle ID (com.apple.Terminal)'), { target: { value: 'com.microsoft.VSCode' } })
    fireEvent.click(screen.getByRole('button', { name: /add app/i }))

    await waitFor(() => {
      expect(createApp).toHaveBeenCalledWith({ displayName: 'VSCode', bundleID: 'com.microsoft.VSCode' })
    })
  })

  it('calls setSelectedAppId when clicking app item', () => {
    const setSelectedAppId = vi.fn()
    render(
      <I18nProvider>
        <AppsTestWrapper setSelectedAppId={setSelectedAppId} />
      </I18nProvider>
    )

    fireEvent.click(screen.getByText('Terminal'))
    expect(setSelectedAppId).toHaveBeenCalledWith('1')
  })
})
