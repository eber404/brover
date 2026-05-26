import { useEffect, useMemo, useState } from 'react'
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
    <div className="grid h-screen grid-cols-[240px_1fr_1fr] gap-3 p-3 text-sm">
      <aside className="rounded-2xl border border-edge bg-panel/90 p-4">
        <h1 className="text-xl font-semibold tracking-tight">{t('app.title')}</h1>
        <p className="mt-1 text-xs text-slate-400">{t('app.subtitle')}</p>
        <div className="mt-8 grid gap-2">
          <button className={`rounded-xl px-3 py-2 text-left ${workspace === 'apps' ? 'bg-accent text-slate-950' : 'bg-slate-900 text-slate-300'}`} onClick={() => setWorkspace('apps')}>{t('workspaces.apps')}</button>
          <button className={`rounded-xl px-3 py-2 text-left ${workspace === 'secrets' ? 'bg-accent text-slate-950' : 'bg-slate-900 text-slate-300'}`} onClick={() => setWorkspace('secrets')}>{t('workspaces.secrets')}</button>
        </div>

        <div className="mt-auto pt-8">
          <select className="w-full rounded-lg border border-edge bg-slate-900 px-2 py-1 text-xs" value={locale} onChange={(e) => setLocale(e.target.value as 'en' | 'es' | 'pt')}>
            <option value="en">English</option>
            <option value="es">Espanol</option>
            <option value="pt">Portugues</option>
          </select>
        </div>
      </aside>

      <section className="rounded-2xl border border-edge bg-panel/85 p-4">
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-edge bg-slate-950/50 px-3 py-2">
          <span className="text-slate-400">{t('search.placeholder')}</span>
          <input className="w-full bg-transparent outline-none" placeholder={workspace === 'apps' ? t('search.appsPlaceholder') : t('search.secretsPlaceholder')} value={searchText} onChange={(event) => setSearchText(event.target.value)} />
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
        <div className="mb-2 text-xs uppercase tracking-widest text-slate-400">{t('common.details')}</div>
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

        <Button className="mt-8" variant="outline" onClick={() => void refreshAll()}>{t('common.refresh')}</Button>
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
