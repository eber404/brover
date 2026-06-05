import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import type { EnvMetadata, EnvTarget } from '../../shared/models'
import { ConfirmDialog } from './components/ui/confirmDialog'
import { ToastProvider } from './components/ui/toaster'
import { I18nProvider, useI18n } from './i18n'
import OnboardingFlow from './features/onboarding/OnboardingFlow'
import { useSecretsPanel } from './features/secrets/SecretsPanel'
import { SpacesSidebar } from './features/spaces/SpacesSidebar'
import { SecretsCenterPanel } from './features/secrets/SecretsCenterPanel'
import { SecretsDetailsPanel } from './features/secrets/SecretsDetailsPanel'
import { TerminalSidebar } from './features/terminals/TerminalSidebar'

const DRAG_REGION_STYLE = {
  WebkitAppRegion: 'drag',
} as unknown as React.CSSProperties

function AppShell() {
  const { t, locale, setLocale } = useI18n()
  const [searchText, setSearchText] = useState('')
  const [targets, setTargets] = useState<EnvTarget[]>([])
  const [envs, setEnvs] = useState<EnvMetadata[]>([])
  const [tiedTargets, setTiedTargets] = useState(true)
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null)
  const [selectedEnvId, setSelectedEnvId] = useState('')
  const [revealValue, setRevealValue] = useState('')
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const deferredSearchText = useDeferredValue(searchText)

  const refreshAll = useCallback(async () => {
    const [nextTargets, nextEnvs, nextTiedTargets] = await Promise.all([
      window.brover.listTargets(),
      window.brover.listEnvs(),
      window.brover.getTiedTargets(),
    ])

    setTargets(nextTargets)
    setEnvs(nextEnvs)
    setTiedTargets(nextTiedTargets)

    const fallbackTargetId = nextTargets.find((target) => target.isActive)?.id ?? nextTargets[0]?.id ?? null
    setSelectedTargetId((current) => {
      if (current && nextTargets.some((target) => target.id === current)) {
        return current
      }

      return fallbackTargetId
    })
  }, [])

  useEffect(() => {
    void refreshAll()
  }, [refreshAll])

  const selectedTarget = useMemo(
    () => targets.find((target) => target.id === selectedTargetId) ?? null,
    [targets, selectedTargetId]
  )

  const targetEnvs = useMemo(
    () => envs.filter((env) => env.profile === selectedTargetId),
    [envs, selectedTargetId]
  )

  const filteredEnvs = useMemo(() => {
    const query = deferredSearchText.trim().toLowerCase()
    if (!query) return targetEnvs
    return targetEnvs.filter(
      (item) => item.name.toLowerCase().includes(query) || (item.description ?? '').toLowerCase().includes(query)
    )
  }, [deferredSearchText, targetEnvs])

  const secretsPanel = useSecretsPanel({
    selectedTargetId,
    targetName: selectedTarget?.name ?? '',
    envs: targetEnvs,
    filteredEnvs,
    selectedEnvId,
    searchQuery: deferredSearchText,
    setSelectedEnvId,
    setEnvs,
    setRevealValue,
  })

  useEffect(() => {
    setSelectedEnvId('')
    setRevealValue('')
  }, [selectedTargetId])

  const addTarget = useCallback(async () => {
    const existingNames = new Set(targets.map((target) => target.name.trim().toLowerCase()))
    const baseName = 'env'
    let name = baseName
    let index = 1
    while (existingNames.has(name.toLowerCase())) {
      name = `${baseName}-${index}`
      index += 1
    }

    const updated = await window.brover.createTarget({ name })
    setTargets(updated)
    const created = updated.find((target) => target.name === name)
    if (!created) return
    setEditingTargetId(created.id)
    setEditingName('')
  }, [targets])

  const deleteTarget = useCallback(
    async (targetId: string) => {
      const updated = await window.brover.deleteTarget({ targetId })
      setTargets(updated)
      if (selectedTargetId === targetId) {
        const next = updated.find((target) => target.isActive) ?? updated[0]
        setSelectedTargetId(next?.id ?? null)
      }
    },
    [selectedTargetId]
  )

  const saveTargetRename = useCallback(
    async (targetId: string) => {
      const name = editingName.trim()
      setEditingTargetId(null)
      if (!name) return
      setTargets(await window.brover.renameTarget({ targetId, name }))
    },
    [editingName]
  )

  const updateTargetColor = useCallback(async (targetId: string, color: string) => {
    setTargets(await window.brover.setTargetColor({ targetId, color }))
  }, [])

  const reorderTargets = useCallback(async (orderedTargetIds: string[]) => {
    setTargets(await window.brover.reorderTargets({ orderedTargetIds }))
  }, [])

  const toggleTiedTargets = useCallback(async () => {
    setTiedTargets(await window.brover.setTiedTargets(!tiedTargets))
  }, [tiedTargets])

  const setActiveTarget = useCallback(async (targetId: string) => {
    setTargets(await window.brover.setActiveTarget({ targetId }))
    setSelectedTargetId(targetId)
  }, [])

  const onSearchChange = useCallback((value: string) => {
    setSearchText(value)
  }, [])

  return (
    <div className="relative grid h-screen grid-cols-[220px_320px_1fr_1fr] grid-rows-[52px_1fr] gap-0 text-sm">
      <div data-testid="drag-bar" className="absolute inset-x-0 top-0 z-50 h-11 w-20" style={DRAG_REGION_STYLE} />
      <div data-testid="drag-bar" className="absolute inset-x-0 right-0 top-0 z-50 h-4 w-full" style={DRAG_REGION_STYLE} />

      <div className="col-start-1 col-end-2 row-start-1 row-end-3">
        <TerminalSidebar title={t('app.title')} subtitle={t('app.subtitle')} locale={locale} onLocaleChange={setLocale} selectedTargetId={selectedTargetId} />
      </div>

      <div className="col-start-2 col-end-3 row-start-1 row-end-3">
        <SpacesSidebar
          targets={targets}
          selectedTargetId={selectedTargetId}
          tiedTargets={tiedTargets}
          editingTargetId={editingTargetId}
          editingName={editingName}
          onEditNameChange={setEditingName}
          onAddTarget={() => void addTarget()}
          onStartRenameTarget={(targetId, currentName) => {
            setEditingTargetId(targetId)
            setEditingName(currentName)
          }}
          onSaveRenameTarget={(targetId) => void saveTargetRename(targetId)}
          onSelectTarget={(targetId) => void setActiveTarget(targetId)}
          onUpdateTargetColor={(targetId, color) => void updateTargetColor(targetId, color)}
          onReorderTargets={(orderedTargetIds) => void reorderTargets(orderedTargetIds)}
          onDeleteTarget={(targetId) => void deleteTarget(targetId)}
          onToggleTiedTargets={() => void toggleTiedTargets()}
        />
      </div>

      <div className="col-start-3 col-end-5 row-start-1 row-end-2 border-b border-edge/60 bg-panel/85">
        <div className="grid h-full grid-cols-[1fr_1fr]">
          <div className="flex items-center gap-2 px-4">
            <Search className="h-4 w-4 shrink-0 text-text-muted" />
            <input
              className="h-full w-full bg-transparent text-sm text-text-base outline-none placeholder:text-text-muted"
              placeholder={t('search.secretsPlaceholder')}
              value={searchText}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </div>
          <div />
        </div>
      </div>

      <div className="col-start-3 col-end-4 row-start-2 row-end-3">
        <SecretsCenterPanel>{secretsPanel.center}</SecretsCenterPanel>
      </div>

      <div className="col-start-4 col-end-5 row-start-2 row-end-3">
        <ConfirmDialog
          open={secretsPanel.deleteConfirmOpen}
          onOpenChange={secretsPanel.setDeleteConfirmOpen}
          title={`Delete "${secretsPanel.selectedEnv?.name}"?`}
          description="This cannot be undone."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          destructive
          onConfirm={() => void secretsPanel.deleteEnvConfirmed()}
        />
        <SecretsDetailsPanel
          title={t('common.details')}
          env={secretsPanel.selectedEnv}
          targetName={selectedTarget?.name ?? '-'}
          revealValue={revealValue}
          hasValue={secretsPanel.hasValue}
          onReveal={() => void secretsPanel.revealEnv()}
          onCopy={(isRevealed) => void secretsPanel.copyEnv(isRevealed)}
          onUpdateValue={(value) => void secretsPanel.updateEnvValue(value)}
          onDelete={() => void secretsPanel.deleteEnv()}
          canDelete={Boolean(secretsPanel.selectedEnv)}
          deleteLabel={t('secrets.deleteSecret')}
        />
      </div>
    </div>
  )
}

export default function App() {
  const [onboardingStatus, setOnboardingStatus] = useState<'loading' | 'pending' | 'done'>('loading')

  useEffect(() => {
    window.brover.onboarding.getStatus().then((status) => {
      setOnboardingStatus(status.completedAt ? 'done' : 'pending')
    })
  }, [])

  if (onboardingStatus === 'loading') {
    return null
  }

  if (onboardingStatus === 'pending') {
    return (
      <I18nProvider>
        <ToastProvider>
          <OnboardingFlow onComplete={() => setOnboardingStatus('done')} />
        </ToastProvider>
      </I18nProvider>
    )
  }

  return (
    <I18nProvider>
      <ToastProvider>
        <AppShell />
      </ToastProvider>
    </I18nProvider>
  )
}
