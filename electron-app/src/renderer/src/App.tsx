import { useEffect, useMemo, useState } from 'react'
import { AppWindow, KeyRound, Search, ShieldCheck } from 'lucide-react'
import type { AppAuthorization, EnvMetadata, Profile, RootWorkspace } from '../../shared/models'
import { Button } from './components/ui/button'
import { ToastProvider } from './components/ui/toaster'
import { I18nProvider, useI18n } from './i18n'
import { SecretsDetail } from './features/secrets/SecretsDetail'
import { useSecretsPanel } from './features/secrets/SecretsPanel'
import { AppsDetail } from './features/apps/AppsDetail'
import { useAppsPanel } from './features/apps/AppsPanel'

function AppShell() {
  const { t, locale, setLocale } = useI18n()
  const [workspace, setWorkspace] = useState<RootWorkspace>('secrets')
  const [searchText, setSearchText] = useState('')
  const [apps, setApps] = useState<AppAuthorization[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [envs, setEnvs] = useState<EnvMetadata[]>([])
  const [selectedAppId, setSelectedAppId] = useState<string>('')
  const [selectedEnvId, setSelectedEnvId] = useState<string>('')
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
    setRevealValue
  })

  return (
    <div className="grid h-screen grid-cols-[220px_400px_1fr] gap-3 p-3 text-sm">
      <aside className="flex flex-col rounded-2xl border border-edge bg-panel/90 p-4 pt-12">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-accent" />
          <h1 className="text-lg font-semibold tracking-tight">{t('app.title')}</h1>
        </div>
        <p className="mt-1 text-xs text-slate-400">{t('app.subtitle')}</p>

        <div className="mt-4 grid gap-1.5">
          <button
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${workspace === 'apps' ? 'bg-accent/15 text-accent' : 'text-slate-300 hover:bg-slate-900'}`}
            onClick={() => setWorkspace('apps')}
          >
            <AppWindow className="h-4 w-4" />
            {t('workspaces.apps')}
          </button>
          <button
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${workspace === 'secrets' ? 'bg-accent/15 text-accent' : 'text-slate-300 hover:bg-slate-900'}`}
            onClick={() => setWorkspace('secrets')}
          >
            <KeyRound className="h-4 w-4" />
            {t('workspaces.secrets')}
          </button>
        </div>

        <div className="mt-auto pt-6">
          <select
            className="w-full rounded-lg border border-edge bg-slate-900 px-2 py-1.5 text-xs text-slate-300 outline-none focus-visible:ring-2 focus-visible:ring-accent"
            value={locale}
            onChange={(e) => setLocale(e.target.value as 'en' | 'es' | 'pt')}
          >
            <option value="en">English</option>
            <option value="es">Espanol</option>
            <option value="pt">Portugues</option>
          </select>
        </div>
      </aside>

      <section className="flex flex-col rounded-2xl border border-edge bg-panel/85 p-4 pt-12">
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-edge bg-slate-950/60 px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-slate-500" />
          <input
            className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
            placeholder={workspace === 'apps' ? t('search.appsPlaceholder') : t('search.secretsPlaceholder')}
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {workspace === 'apps' ? (
            <>{appsPanel.center}</>
          ) : (
            <>{secretsPanel.center}</>
          )}
        </div>
      </section>

      <section className="flex flex-col rounded-2xl border border-edge bg-panel/80 p-4 pt-12">
        <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">{t('common.details')}</div>
        <div className="flex-1 overflow-y-auto">
          {workspace === 'apps' ? (
            <AppsDetail
              app={appsPanel.selectedApp}
              enabled={appsPanel.selectedApp?.enabled ?? false}
              onToggleEnabled={() => void window.brover.toggleApp(appsPanel.selectedApp!.id).then(setApps)}
              onDelete={() => void window.brover.deleteApp(appsPanel.selectedApp!.id).then(setApps)}
            />
          ) : (
            <SecretsDetail
              env={secretsPanel.selectedEnv}
              enabled={secretsPanel.selectedEnv?.enabled ?? false}
              revealValue={revealValue}
              onReveal={() => void secretsPanel.revealEnv()}
              onCopy={() => void secretsPanel.copyEnv()}
              onToggleEnabled={() => void window.brover.toggleEnvEnabled(secretsPanel.selectedEnv!.id).then(setEnvs)}
              onDelete={() => void secretsPanel.deleteEnv()}
              onUpdateValue={(value) => void secretsPanel.updateEnvValue(value)}
            />
          )}
        </div>

        <Button className="mt-4 shrink-0" variant="outline" onClick={() => void refreshAll()}>
          {t('common.refresh')}
        </Button>
      </section>
    </div>
  )
}

export default function App() {
  return (
    <I18nProvider>
      <ToastProvider>
        <AppShell />
      </ToastProvider>
    </I18nProvider>
  )
}
