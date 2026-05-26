import { useEffect, useMemo, useState } from 'react'
import type { AppAuthorization, EnvMetadata, Profile, RootWorkspace } from '../../shared/models'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { useSecretsPanel } from './features/secrets/SecretsPanel'
import { useAppsPanel } from './features/apps/AppsPanel'

function App() {
  const [workspace, setWorkspace] = useState<RootWorkspace>('secrets')
  const [searchText, setSearchText] = useState('')
  const [apps, setApps] = useState<AppAuthorization[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [envs, setEnvs] = useState<EnvMetadata[]>([])
  const [selectedAppId, setSelectedAppId] = useState<string>('')
  const [selectedEnvId, setSelectedEnvId] = useState<string>('')
  const [message, setMessage] = useState('')
  const [revealValue, setRevealValue] = useState('')

  const [newAppName, setNewAppName] = useState('')
  const [newAppBundle, setNewAppBundle] = useState('')

  const selectedProfile = useMemo(() => profiles.find((p) => p.isActive) ?? profiles[0], [profiles])
  const filteredApps = useMemo(() => {
    if (!searchText.trim()) return apps
    return apps.filter((item) => item.displayName.toLowerCase().includes(searchText.toLowerCase()) || item.bundleID.toLowerCase().includes(searchText.toLowerCase()))
  }, [apps, searchText])

  const filteredEnvs = useMemo(() => {
    if (!searchText.trim()) return envs
    return envs.filter((item) => item.name.toLowerCase().includes(searchText.toLowerCase()) || (item.description ?? '').toLowerCase().includes(searchText.toLowerCase()))
  }, [envs, searchText])

  async function refreshAll() {
    const [nextApps, nextProfiles, nextEnvs] = await Promise.all([window.brover.listApps(), window.brover.listProfiles(), window.brover.listEnvs()])
    setApps(nextApps)
    setProfiles(nextProfiles)
    setEnvs(nextEnvs)
  }

  useEffect(() => {
    void refreshAll()
  }, [])

  const appsPanel = useAppsPanel({
    apps,
    filteredApps,
    selectedAppId,
    setSelectedAppId,
    newAppName,
    setNewAppName,
    newAppBundle,
    setNewAppBundle,
    setApps
  })

  const secretsPanel = useSecretsPanel({
    profiles,
    selectedProfile,
    envs,
    filteredEnvs,
    selectedEnvId,
    setSelectedEnvId,
    setProfiles,
    setEnvs,
    setMessage,
    setRevealValue
  })

  return (
    <div className="grid h-screen grid-cols-[240px_1fr_1fr] gap-3 p-3 text-sm">
      <aside className="rounded-2xl border border-edge bg-panel/90 p-4">
        <h1 className="text-xl font-semibold tracking-tight">Brover</h1>
        <p className="mt-1 text-xs text-slate-400">Desktop secrets control plane</p>
        <div className="mt-8 grid gap-2">
          <button className={`rounded-xl px-3 py-2 text-left ${workspace === 'apps' ? 'bg-accent text-slate-950' : 'bg-slate-900 text-slate-300'}`} onClick={() => setWorkspace('apps')}>Apps</button>
          <button className={`rounded-xl px-3 py-2 text-left ${workspace === 'secrets' ? 'bg-accent text-slate-950' : 'bg-slate-900 text-slate-300'}`} onClick={() => setWorkspace('secrets')}>Secrets</button>
        </div>
      </aside>

      <section className="rounded-2xl border border-edge bg-panel/85 p-4">
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-edge bg-slate-950/50 px-3 py-2">
          <span className="text-slate-400">Search</span>
          <input className="w-full bg-transparent outline-none" placeholder={workspace === 'apps' ? 'Search apps...' : 'Search secrets...'} value={searchText} onChange={(event) => setSearchText(event.target.value)} />
        </div>

        {workspace === 'apps' ? (
          <>{appsPanel.center}</>
        ) : (
          <>
            {secretsPanel.center}
          </>
        )}
      </section>

      <section className="rounded-2xl border border-edge bg-panel/80 p-4">
        <div className="mb-2 text-xs uppercase tracking-widest text-slate-400">Details</div>
        {workspace === 'apps' ? (
          appsPanel.selectedApp ? (
            <div className="grid gap-3">
              <div>
                <div className="text-lg font-semibold">{appsPanel.selectedApp.displayName}</div>
                <div className="text-xs text-slate-400">{appsPanel.selectedApp.bundleID}</div>
              </div>
              <Button variant="outline" onClick={() => void window.brover.toggleApp(appsPanel.selectedApp.id).then(setApps)}>Toggle Enabled</Button>
              <Button variant="destructive" onClick={() => void window.brover.deleteApp(appsPanel.selectedApp.id).then(setApps)}>Delete App</Button>
            </div>
          ) : (
            <p className="text-slate-400">Select an app.</p>
          )
        ) : secretsPanel.selectedEnv ? (
          <div className="grid gap-3">
            <div>
              <div className="text-lg font-semibold">{secretsPanel.selectedEnv.name}</div>
              <div className="text-xs text-slate-400">Profile: {secretsPanel.selectedEnv.profile}</div>
            </div>
            <Button variant="outline" onClick={() => void secretsPanel.revealEnv()}>Reveal Secret</Button>
            <Button variant="outline" onClick={() => void secretsPanel.copyEnv()}>Copy Secret</Button>
            <div className="grid gap-2">
              <Input placeholder="New secret value" value={secretsPanel.editedValue} onChange={(event) => secretsPanel.setEditedValue(event.target.value)} />
              <Button variant="outline" onClick={() => void secretsPanel.updateEnvValue()}>Update Secret Value</Button>
            </div>
            <Button variant="outline" onClick={() => void window.brover.toggleEnvEnabled(secretsPanel.selectedEnv.id).then(setEnvs)}>Enable/Disable</Button>
            <Button variant="destructive" onClick={() => void secretsPanel.deleteEnv()}>Delete Secret</Button>
            {revealValue && <div className="rounded-lg border border-edge bg-slate-950/60 p-3 font-mono text-xs">{revealValue}</div>}
          </div>
        ) : (
          <p className="text-slate-400">Select a secret.</p>
        )}

        <Button className="mt-8" variant="outline" onClick={() => void refreshAll()}>Refresh</Button>
        {message && <div className="mt-3 rounded-lg border border-amber-300/40 bg-amber-950/30 p-2 text-xs text-amber-200">{message}</div>}
      </section>
    </div>
  )
}

export default App
