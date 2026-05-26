import type { AppAuthorization } from '../../../../shared/models'
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
          <Input placeholder="Display name" value={newAppName} onChange={(event) => setNewAppName(event.target.value)} />
          <Input placeholder="Bundle ID (com.apple.Terminal)" value={newAppBundle} onChange={(event) => setNewAppBundle(event.target.value)} />
          <Button onClick={() => void createApp()}>Add App</Button>
        </Card>

        <div className="grid gap-2">
          {filteredApps.map((item) => (
            <button key={item.id} className={`rounded-xl border p-3 text-left ${selectedAppId === item.id ? 'border-accent bg-slate-900' : 'border-edge bg-slate-950/30'}`} onClick={() => setSelectedAppId(item.id)}>
              <div className="font-semibold">{item.displayName}</div>
              <div className="text-xs text-slate-400">{item.bundleID}</div>
            </button>
          ))}
        </div>
      </>
    ),
    selectedApp
  }
}
