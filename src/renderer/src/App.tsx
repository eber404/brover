import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import type { EnvMetadata, Environment } from '../../shared/models'
import { ConfirmDialog } from './components/ui/confirmDialog'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from './components/ui/dialog'
import { ToastProvider } from './components/ui/toaster'
import HideSplash from './components/HideSplash'
import { I18nProvider, useI18n } from './i18n'
import OnboardingFlow from './features/onboarding/OnboardingFlow'
import { useSecretsPanel } from './features/secrets/SecretsPanel'
import { EnvironmentsSidebar } from './features/environments/EnvironmentsSidebar'
import { SecretsCenterPanel } from './features/secrets/SecretsCenterPanel'
import { SecretsDetailsPanel } from './features/secrets/SecretsDetailsPanel'
import { TerminalSidebar } from './features/terminals/TerminalSidebar'

const DRAG_REGION_STYLE = {
  WebkitAppRegion: 'drag',
} as unknown as React.CSSProperties

function AppShell() {
  const { t, locale, setLocale } = useI18n()
  const [searchText, setSearchText] = useState('')
  const [environments, setEnvironments] = useState<Environment[]>([])
  const [envs, setEnvs] = useState<EnvMetadata[]>([])
  const [sharedSecretNames, setSharedSecretNames] = useState(false)
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState<string | null>(null)
  const [selectedEnvId, setSelectedEnvId] = useState('')
  const [authorizedSecretId, setAuthorizedSecretId] = useState<string | null>(null)
  const [revealValue, setRevealValue] = useState('')
  const [editingEnvironmentId, setEditingEnvironmentId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const deferredSearchText = useDeferredValue(searchText)

  const refreshAll = useCallback(async () => {
    const [nextEnvironments, nextEnvs, nextSharedSecretNames] = await Promise.all([
      window.brover.listEnvironments(),
      window.brover.listEnvs(),
      window.brover.getSharedSecretNames(),
    ])

    setEnvironments(nextEnvironments)
    setEnvs(nextEnvs)
    setSharedSecretNames(nextSharedSecretNames)

    const fallbackEnvironmentId = nextEnvironments.find((environment) => environment.isActive)?.id ?? nextEnvironments[0]?.id ?? null
    setSelectedEnvironmentId((current) => {
      if (current && nextEnvironments.some((environment) => environment.id === current)) {
        return current
      }

      return fallbackEnvironmentId
    })
  }, [])

  useEffect(() => {
    void refreshAll()
  }, [refreshAll])

  const selectedEnvironment = useMemo(
    () => environments.find((environment) => environment.id === selectedEnvironmentId) ?? null,
    [environments, selectedEnvironmentId]
  )

  const environmentEnvs = useMemo(
    () => envs.filter((env) => env.profile === selectedEnvironmentId),
    [envs, selectedEnvironmentId]
  )

  const filteredEnvs = useMemo(() => {
    const query = deferredSearchText.trim().toLowerCase()
    if (!query) return environmentEnvs
    return environmentEnvs.filter(
      (item) => item.name.toLowerCase().includes(query) || (item.description ?? '').toLowerCase().includes(query)
    )
  }, [deferredSearchText, environmentEnvs])

  const secretsPanel = useSecretsPanel({
    selectedEnvironmentId,
    environmentName: selectedEnvironment?.name ?? '',
    envs: environmentEnvs,
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
  }, [selectedEnvironmentId])

  const addEnvironment = useCallback(async () => {
    const existingNames = new Set(environments.map((environment) => environment.name.trim().toLowerCase()))
    const baseName = 'env'
    let name = baseName
    let index = 1
    while (existingNames.has(name.toLowerCase())) {
      name = `${baseName}-${index}`
      index += 1
    }

    const updated = await window.brover.createEnvironment({ name })
    setEnvironments(updated)
    const created = updated.find((environment) => environment.name === name)
    if (!created) return
    setEditingEnvironmentId(created.id)
    setEditingName('')
  }, [environments])

  const deleteEnvironment = useCallback(
    async (environmentId: string) => {
      const updated = await window.brover.deleteEnvironment({ environmentId })
      setEnvironments(updated)
      if (selectedEnvironmentId === environmentId) {
        const next = updated.find((environment) => environment.isActive) ?? updated[0]
        setSelectedEnvironmentId(next?.id ?? null)
      }
    },
    [selectedEnvironmentId]
  )

  const saveEnvironmentRename = useCallback(
    async (environmentId: string) => {
      const name = editingName.trim()
      setEditingEnvironmentId(null)
      if (!name) return
      setEnvironments(await window.brover.renameEnvironment({ environmentId, name }))
    },
    [editingName]
  )

  const updateEnvironmentColor = useCallback(async (environmentId: string, color: string) => {
    setEnvironments(await window.brover.setEnvironmentColor({ environmentId, color }))
  }, [])

  const reorderEnvironments = useCallback(async (orderedEnvironmentIds: string[]) => {
    setEnvironments(await window.brover.reorderEnvironments({ orderedEnvironmentIds }))
  }, [])

  const toggleSharedSecretNames = useCallback(async () => {
    setSharedSecretNames(await window.brover.setSharedSecretNames(!sharedSecretNames))
  }, [sharedSecretNames])

  const setActiveEnvironment = useCallback(async (environmentId: string) => {
    setEnvironments(await window.brover.setActiveEnvironment({ environmentId }))
    setSelectedEnvironmentId(environmentId)
  }, [])

  const onSearchChange = useCallback((value: string) => {
    setSearchText(value)
  }, [])

  const closeSecretDetails = useCallback(() => {
    setSelectedEnvId('')
    setAuthorizedSecretId(null)
    setRevealValue('')
  }, [])

  useEffect(() => {
    if (!selectedEnvId) {
      setAuthorizedSecretId(null)
      return
    }

    let cancelled = false
    void Promise.resolve(secretsPanel.revealEnv()).then((authorized) => {
      if (cancelled) return
      if (authorized) {
        setAuthorizedSecretId(selectedEnvId)
        return
      }
      setSelectedEnvId('')
    })

    return () => {
      cancelled = true
    }
  }, [selectedEnvId])

  const confirmationOpen = secretsPanel.updateConfirmOpen || secretsPanel.deleteConfirmOpen
  let confirmationDialog = null
  if (secretsPanel.updateConfirmOpen) {
    confirmationDialog = (
      <ConfirmDialog
        open={secretsPanel.updateConfirmOpen}
        onOpenChange={secretsPanel.closeUpdateConfirmation}
        title={`Update "${secretsPanel.selectedEnv?.name}"?`}
        description="This will replace the current secret value."
        confirmLabel="Update"
        cancelLabel="Cancel"
        onConfirm={secretsPanel.updateEnvConfirmed}
      />
    )
  } else if (secretsPanel.deleteConfirmOpen) {
    confirmationDialog = (
      <ConfirmDialog
        open={secretsPanel.deleteConfirmOpen}
        onOpenChange={secretsPanel.setDeleteConfirmOpen}
        title={`Delete "${secretsPanel.selectedEnv?.name}"?`}
        description="This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={secretsPanel.deleteEnvConfirmed}
      />
    )
  }

  const isDetailsOpen = Boolean(selectedEnvId) && authorizedSecretId === selectedEnvId

  const secretDetailsDialog = isDetailsOpen && !confirmationOpen ? (
    <Dialog
      open={isDetailsOpen}
      onOpenChange={(open) => {
        if (!open) closeSecretDetails()
      }}
    >
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto">
        <DialogTitle className="sr-only">{`${t('common.details')}: ${secretsPanel.selectedEnv?.name ?? 'secret'}`}</DialogTitle>
        <DialogDescription className="sr-only">
          {`${secretsPanel.selectedEnv?.name ?? 'Secret'} in ${selectedEnvironment?.name ?? '-'}`}
        </DialogDescription>
        <DialogClose asChild>
          <button
            type="button"
            className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition hover:bg-surface-overlay hover:text-text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="Close details"
            title="Close details"
          >
            <X className="h-4 w-4" />
          </button>
        </DialogClose>
        <SecretsDetailsPanel
          title={t('common.details')}
          env={secretsPanel.selectedEnv}
          environmentName={selectedEnvironment?.name ?? '-'}
          revealValue={revealValue}
          hasValue={secretsPanel.hasValue}
          onCopy={(isRevealed) => void secretsPanel.copyEnv(isRevealed)}
          onUpdateValue={(value) => void secretsPanel.updateEnvValue(value)}
          onDelete={() => void secretsPanel.deleteEnv()}
          canDelete={Boolean(secretsPanel.selectedEnv)}
          deleteLabel={t('secrets.deleteSecret')}
        />
      </DialogContent>
    </Dialog>
  ) : null

  return (
    <div className="relative grid h-screen grid-cols-[84px_320px_1fr] grid-rows-[52px_1fr] gap-0 text-sm">
      <div data-testid="drag-bar" className="absolute inset-x-0 top-0 z-50 h-11 w-20" style={DRAG_REGION_STYLE} />
      <div data-testid="drag-bar" className="absolute inset-x-0 right-0 top-0 z-50 h-4 w-full" style={DRAG_REGION_STYLE} />

      <div className="col-start-1 col-end-2 row-start-1 row-end-3">
        <TerminalSidebar locale={locale} onLocaleChange={setLocale} selectedEnvironmentId={selectedEnvironmentId} />
      </div>

      <div className="col-start-2 col-end-3 row-start-1 row-end-3">
        <EnvironmentsSidebar
          title={t('app.title')}
          subtitle={t('app.subtitle')}
          environments={environments}
          selectedEnvironmentId={selectedEnvironmentId}
          sharedSecretNames={sharedSecretNames}
          editingEnvironmentId={editingEnvironmentId}
          editingName={editingName}
          onEditNameChange={setEditingName}
          onAddEnvironment={() => void addEnvironment()}
          onStartRenameEnvironment={(environmentId, currentName) => {
            setEditingEnvironmentId(environmentId)
            setEditingName(currentName)
          }}
          onSaveRenameEnvironment={(environmentId) => void saveEnvironmentRename(environmentId)}
          onSelectEnvironment={(environmentId) => void setActiveEnvironment(environmentId)}
          onUpdateEnvironmentColor={(environmentId, color) => void updateEnvironmentColor(environmentId, color)}
          onReorderEnvironments={(orderedEnvironmentIds) => void reorderEnvironments(orderedEnvironmentIds)}
          onDeleteEnvironment={(environmentId) => void deleteEnvironment(environmentId)}
          onToggleSharedSecretNames={() => void toggleSharedSecretNames()}
        />
      </div>

      <div className="col-start-3 col-end-4 row-start-1 row-end-2 border-b border-edge/60 bg-panel/85">
        <div className="flex h-full items-center gap-2 px-4">
          <Search className="h-4 w-4 shrink-0 text-text-muted" />
          <input
            className="h-full w-full bg-transparent text-sm text-text-base placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            placeholder={t('search.secretsPlaceholder')}
            value={searchText}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
      </div>

      <div className="col-start-3 col-end-4 row-start-2 row-end-3">
        <SecretsCenterPanel>{secretsPanel.center}</SecretsCenterPanel>
      </div>

      {confirmationDialog}
      {secretDetailsDialog}
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
          <HideSplash>
            <OnboardingFlow onComplete={() => setOnboardingStatus('done')} />
          </HideSplash>
        </ToastProvider>
      </I18nProvider>
    )
  }

  return (
    <I18nProvider>
      <ToastProvider>
        <HideSplash>
          <AppShell />
        </HideSplash>
      </ToastProvider>
    </I18nProvider>
  )
}
