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

        {filteredApps.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-edge bg-slate-950/30 p-8 text-center">
            <AppWindow className="h-10 w-10 text-slate-500" />
            <div className="text-sm font-medium text-slate-300">{t('apps.noApps')}</div>
            <div className="text-xs text-slate-500">{t('apps.noAppsDescription')}</div>
          </div>
        ) : (
          <div className="grid gap-2">
            {filteredApps.map((item) => (
              <button key={item.id} className={`flex items-center gap-3 rounded-xl border p-3 text-left ${selectedAppId === item.id ? 'border-accent bg-slate-900' : 'border-edge bg-slate-950/30'}`} onClick={() => setSelectedAppId(item.id)}>
                <AppWindow className="h-5 w-5 shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold">{item.displayName}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${item.enabled ? 'bg-emerald-950/50 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                      {item.enabled ? t('secrets.enabled') : t('secrets.disabled')}
                    </span>
                  </div>
                  <div className="truncate text-xs text-slate-400">{item.bundleID}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </>
    ),
    selectedApp
  }
}
