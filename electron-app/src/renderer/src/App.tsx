import { useEffect, useMemo, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Folder,
  KeyRound,
  Plus,
  Search,
  ShieldCheck,
} from 'lucide-react'
import type { EnvMetadata, EnvSpace, EnvTarget } from '../../shared/models'
import { Button } from './components/ui/button'
import { ToastProvider } from './components/ui/toaster'
import { I18nProvider, useI18n } from './i18n'
import { SecretsDetail } from './features/secrets/SecretsDetail'
import { useSecretsPanel } from './features/secrets/SecretsPanel'

function AppShell() {
  const { t, locale, setLocale } = useI18n()
  const [searchText, setSearchText] = useState('')
  const [spaces, setSpaces] = useState<EnvSpace[]>([])
  const [targets, setTargets] = useState<EnvTarget[]>([])
  const [envs, setEnvs] = useState<EnvMetadata[]>([])
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null)
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null)
  const [selectedEnvId, setSelectedEnvId] = useState<string>('')
  const [revealValue, setRevealValue] = useState('')
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  async function refreshAll() {
    const [nextSpaces, nextEnvs] = await Promise.all([
      window.brover.listSpaces(),
      window.brover.listEnvs(),
    ])
    const targetLists = await Promise.all(
      nextSpaces.map((space) => window.brover.listTargets(space.id))
    )
    const nextTargets = targetLists.flat()
    setSpaces(nextSpaces)
    setTargets(nextTargets)
    setEnvs(nextEnvs)

    if (!selectedSpaceId && nextSpaces.length > 0) {
      setSelectedSpaceId(nextSpaces[0].id)
    }
    if (!selectedTargetId && nextTargets.length > 0) {
      const activeGlobal = nextTargets.find(
        (target) => target.spaceId === 'space-global' && target.isActive
      )
      setSelectedTargetId(activeGlobal?.id ?? nextTargets[0].id)
    }
  }

  useEffect(() => {
    void refreshAll()
  }, [])

  const selectedTarget = useMemo(
    () => targets.find((target) => target.id === selectedTargetId) ?? null,
    [targets, selectedTargetId]
  )
  const selectedSpace = useMemo(
    () => spaces.find((space) => space.id === selectedSpaceId) ?? null,
    [spaces, selectedSpaceId]
  )

  const targetEnvs = useMemo(
    () => envs.filter((env) => env.profile === selectedTargetId),
    [envs, selectedTargetId]
  )

  const filteredEnvs = useMemo(() => {
    if (!searchText.trim()) return targetEnvs
    return targetEnvs.filter(
      (item) =>
        item.name.toLowerCase().includes(searchText.toLowerCase()) ||
        (item.description ?? '').toLowerCase().includes(searchText.toLowerCase())
    )
  }, [targetEnvs, searchText])

  const secretsPanel = useSecretsPanel({
    selectedTargetId,
    envs: targetEnvs,
    filteredEnvs,
    selectedEnvId,
    setSelectedEnvId,
    setEnvs,
    setRevealValue,
  })

  useEffect(() => {
    setSelectedEnvId('')
    setRevealValue('')
  }, [selectedTargetId])

  async function toggleSpace(spaceId: string) {
    setSpaces(await window.brover.toggleSpaceExpanded(spaceId))
  }

  async function addSpace() {
    const name = window.prompt('Space name')?.trim()
    if (!name) return
    const path = window.prompt('Directory path')?.trim()
    if (!path) return
    const nextSpaces = await window.brover.createSpace({ name, path })
    const nextTargets = await Promise.all(
      nextSpaces.map((space) => window.brover.listTargets(space.id))
    )
    setSpaces(nextSpaces)
    setTargets(nextTargets.flat())
  }

  async function addTarget(spaceId: string) {
    const name = window.prompt('Target name (e.g. dev)')?.trim()
    if (!name) return
    const updated = await window.brover.createTarget({ spaceId, name })
    setTargets((prev) => [...prev.filter((item) => item.spaceId !== spaceId), ...updated])
  }

  async function saveTargetRename(targetId: string) {
    const name = editingName.trim()
    setEditingTargetId(null)
    if (!name) return
    const target = targets.find((item) => item.id === targetId)
    if (!target) return
    const updated = await window.brover.renameTarget({ targetId, name })
    setTargets((prev) => [...prev.filter((item) => item.spaceId !== target.spaceId), ...updated])
  }

  async function updateTargetColor(targetId: string, color: string) {
    const target = targets.find((item) => item.id === targetId)
    if (!target) return
    const updated = await window.brover.setTargetColor({ targetId, color })
    setTargets((prev) => [...prev.filter((item) => item.spaceId !== target.spaceId), ...updated])
  }

  async function setActiveTarget(spaceId: string, targetId: string) {
    const updated = await window.brover.setActiveTarget({ spaceId, targetId })
    setTargets((prev) => [...prev.filter((item) => item.spaceId !== spaceId), ...updated])
    setSelectedSpaceId(spaceId)
    setSelectedTargetId(targetId)
  }

  async function applyCurrentSelection() {
    if (!selectedTarget || !selectedSpace) return
    if (selectedSpace.kind === 'global') {
      await window.brover.applyGlobalShell()
      return
    }
    await window.brover.applyDirectoryTarget({ targetId: selectedTarget.id })
  }

  return (
    <div className="relative grid h-screen grid-cols-[260px_1fr_1fr] gap-3 p-4 pt-11 text-sm">
      <div data-testid="drag-bar" className="absolute inset-x-0 top-0 z-50 h-11 w-full" style={{ WebkitAppRegion: 'drag' } as any} />
      <div data-testid="drag-bar" className="absolute inset-x-0 left-0 z-50 h-full w-4" style={{ WebkitAppRegion: 'drag' } as any} />
      <div data-testid="drag-bar" className="absolute top-0 right-0 z-50 h-full w-4" style={{ WebkitAppRegion: 'drag' } as any} />
      <div data-testid="drag-bar" className="absolute bottom-0 z-50 h-4 w-full" style={{ WebkitAppRegion: 'drag' } as any} />

      <aside className="flex flex-col rounded-2xl border border-edge bg-panel/90 p-4 pt-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-accent" />
          <h1 className="text-lg font-semibold tracking-tight">{t('app.title')}</h1>
        </div>
        <p className="mt-1 text-xs text-slate-400">{t('app.subtitle')}</p>

        <div className="mt-6 mb-2 flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">ENV SPACES</div>
          <button onClick={() => void addSpace()} className="rounded p-1 text-slate-300 hover:bg-slate-900">
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-1.5 overflow-y-auto">
          {spaces.map((space) => {
            const spaceTargets = targets.filter((target) => target.spaceId === space.id)
            return (
              <div key={space.id} className="rounded-lg border border-edge/40 bg-slate-950/20 p-1.5">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => void toggleSpace(space.id)}
                    className="rounded p-1 text-slate-300 hover:bg-slate-900"
                  >
                    {space.expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  <Folder className="h-4 w-4 text-slate-400" />
                  <button
                    className={`min-w-0 flex-1 truncate rounded px-2 py-1 text-left ${selectedSpaceId === space.id ? 'text-accent' : 'text-slate-200'}`}
                    onClick={() => {
                      setSelectedSpaceId(space.id)
                      if (!selectedTargetId && spaceTargets[0]) {
                        setSelectedTargetId(spaceTargets[0].id)
                      }
                    }}
                  >
                    {space.name}
                  </button>
                  <button onClick={() => void addTarget(space.id)} className="rounded p-1 text-slate-300 hover:bg-slate-900">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                {space.expanded && (
                  <div className="mt-1 grid gap-1 pl-6">
                    {spaceTargets.map((target) => (
                      <div key={target.id} className="flex items-center gap-2 rounded px-1 py-1 hover:bg-slate-900/60">
                        {editingTargetId === target.id ? (
                          <input
                            autoFocus
                            className="h-7 flex-1 rounded border border-edge bg-slate-900 px-2 text-xs"
                            value={editingName}
                            onChange={(event) => setEditingName(event.target.value)}
                            onBlur={() => void saveTargetRename(target.id)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                void saveTargetRename(target.id)
                              }
                            }}
                          />
                        ) : (
                          <button
                            className={`flex-1 truncate rounded px-2 py-1 text-left text-xs ${selectedTargetId === target.id ? 'bg-accent/15 text-accent' : 'text-slate-300'}`}
                            onClick={() => void setActiveTarget(space.id, target.id)}
                            onDoubleClick={() => {
                              setEditingTargetId(target.id)
                              setEditingName(target.name)
                            }}
                          >
                            {target.name}
                          </button>
                        )}

                        <label className="relative h-4 w-4 cursor-pointer overflow-hidden rounded-full border border-edge">
                          <input
                            type="color"
                            className="absolute inset-0 h-full w-full opacity-0"
                            value={target.color}
                            onChange={(event) => void updateTargetColor(target.id, event.target.value)}
                          />
                          <span className="block h-full w-full" style={{ backgroundColor: target.color }} />
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
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

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-edge bg-slate-950/60 px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-slate-500" />
          <input
            className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
            placeholder={t('search.secretsPlaceholder')}
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
        </div>

        <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-edge bg-panel/85 p-4">
          <div className="flex-1 overflow-y-auto">{secretsPanel.center}</div>
        </section>
      </div>

      <section className="flex flex-col rounded-2xl border border-edge bg-panel/80 p-4 pt-6">
        <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">{t('common.details')}</div>
        <div className="flex-1 overflow-y-auto">
          <SecretsDetail
            env={secretsPanel.selectedEnv}
            targetName={selectedTarget?.name ?? '-'}
            enabled={secretsPanel.selectedEnv?.enabled ?? false}
            revealValue={revealValue}
            onReveal={() => void secretsPanel.revealEnv()}
            onCopy={(isRevealed) => void secretsPanel.copyEnv(isRevealed)}
            onToggleEnabled={() =>
              void window.brover
                .toggleEnvEnabled(secretsPanel.selectedEnv!.id)
                .then(setEnvs)
            }
            onUpdateValue={(value) => void secretsPanel.updateEnvValue(value)}
          />
        </div>

        <Button
          className="mb-2 shrink-0"
          variant="outline"
          onClick={() => void applyCurrentSelection()}
          disabled={!selectedTarget}
        >
          {selectedSpace?.kind === 'global' ? 'Apply to zsh/bash' : 'Apply to .env target'}
        </Button>

        <Button
          data-testid="secret-delete-bottom"
          className="mt-4 shrink-0"
          variant="destructive"
          onClick={() => void secretsPanel.deleteEnv()}
          disabled={!secretsPanel.selectedEnv}
        >
          {t('secrets.deleteSecret')}
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
