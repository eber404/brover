import { AppWindow, Plus, Search } from 'lucide-react'
import type { AppAuthorization } from '../../../../shared/models'
import { useI18n } from '../../i18n'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/input'

interface AppsPanelProps {
  apps: AppAuthorization[]
  filteredApps: AppAuthorization[]
  selectedAppId: string
  setSelectedAppId: (value: string) => void
  newAppName: string
  setNewAppName: (value: string) => void
  newAppBundle: string
  setNewAppBundle: (value: string) => void
  setApps: (items: AppAuthorization[]) => void
}

export function useAppsPanel(props: AppsPanelProps) {
  const { t } = useI18n()
  const {
    apps,
    filteredApps,
    selectedAppId,
    setSelectedAppId,
    newAppName,
    setNewAppName,
    newAppBundle,
    setNewAppBundle,
    setApps
  } = props

  const selectedApp = apps.find((item) => item.id === selectedAppId) ?? null

  async function createApp() {
    const next = await window.brover.createApp({ displayName: newAppName, bundleID: newAppBundle })
    setApps(next)
    setNewAppName('')
    setNewAppBundle('')
  }

  function statusLabel(enabled: boolean) {
    if (enabled) return t('secrets.enabled')
    return t('secrets.disabled')
  }

  let listContent: React.ReactNode
  if (filteredApps.length === 0) {
    listContent = (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-edge bg-surface-card p-4 text-center">
        <AppWindow className="h-6 w-6 text-text-muted" />
        <div className="text-sm font-medium text-text-base">{t('apps.noApps')}</div>
      </div>
    )
  } else {
    listContent = (
      <div className="grid gap-2">
        {filteredApps.map((item) => (
          <button key={item.id} className={`flex items-center gap-3 rounded-xl border p-3 text-left ${selectedAppId === item.id ? 'border-accent bg-surface-active' : 'border-edge bg-surface-card'}`} onClick={() => setSelectedAppId(item.id)}>
            <AppWindow className="h-5 w-5 shrink-0 text-text-muted" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-semibold">{item.displayName}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${item.enabled ? 'bg-emerald-on text-emerald-status' : 'bg-surface-active text-text-muted'}`}>
                  {statusLabel(item.enabled)}
                </span>
              </div>
              <div className="truncate text-xs text-text-muted">{item.bundleID}</div>
            </div>
          </button>
        ))}
      </div>
    )
  }

  return {
    center: (
      <>
        <Card className="mb-4 grid gap-2">
          <Input placeholder={t('apps.displayName')} value={newAppName} onChange={(event) => setNewAppName(event.target.value)} />
          <Input placeholder={t('apps.bundleId')} value={newAppBundle} onChange={(event) => setNewAppBundle(event.target.value)} />
          <Button onClick={() => void createApp()}>
            <Plus className="mr-2 h-4 w-4" />
            {t('apps.addApp')}
          </Button>
        </Card>

        {listContent}
      </>
    ),
    selectedApp
  }
}
