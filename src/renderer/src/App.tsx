import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { Search } from 'lucide-react'
import type { EnvMetadata, EnvSpace, EnvTarget } from '../../shared/models'
import { Button } from './components/ui/button'
import { ConfirmDialog } from './components/ui/confirmDialog'
import { ToastProvider } from './components/ui/toaster'
import { I18nProvider, useI18n } from './i18n'
import OnboardingFlow from './features/onboarding/OnboardingFlow'
import { SecretsDetail } from './features/secrets/SecretsDetail'
import { useSecretsPanel } from './features/secrets/SecretsPanel'
import { SpacesSidebar } from './features/spaces/SpacesSidebar'
import { SecretsCenterPanel } from './features/secrets/SecretsCenterPanel'
import { SecretsDetailsPanel } from './features/secrets/SecretsDetailsPanel'

const DRAG_REGION_STYLE = {
  WebkitAppRegion: 'drag',
} as unknown as React.CSSProperties

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
  const [editingSpaceId, setEditingSpaceId] = useState<string | null>(null)
  const [editingSpaceName, setEditingSpaceName] = useState('')
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const deferredSearchText = useDeferredValue(searchText)

  const refreshAll = useCallback(async () => {
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
      setSelectedTargetId(nextTargets[0].id)
    }
  }, [selectedSpaceId, selectedTargetId])

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

  const targetsBySpace = useMemo(() => {
    const map = new Map<string, EnvTarget[]>()
    for (const target of targets) {
      const list = map.get(target.spaceId)
      if (list) {
        list.push(target)
      } else {
        map.set(target.spaceId, [target])
      }
    }
    return map
  }, [targets])



  const filteredEnvs = useMemo(() => {
    const query = deferredSearchText.trim().toLowerCase()
    if (!query) return targetEnvs
    return targetEnvs.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        (item.description ?? '').toLowerCase().includes(query)
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

  const addSpace = useCallback(async () => {
    const picked = await window.brover.pickDotfile()
    if (picked.canceled || !picked.filePath) return
    const filePath = picked.filePath.trim()
    if (spaces.some((s) => s.dotfilePath === filePath)) return
    const segments = filePath.split('/').filter(Boolean)
    const fallbackName = segments[segments.length - 1] ?? 'Space'
    const name = fallbackName.trim()
    const nextSpaces = await window.brover.createSpace({ name, dotfilePath: filePath })
    const nextTargets = await Promise.all(
      nextSpaces.map((space) => window.brover.listTargets(space.id))
    )
    setSpaces(nextSpaces)
    setTargets(nextTargets.flat())
  }, [spaces])

  const startRenameSpace = useCallback(
    (spaceId: string, currentName: string) => {
      setEditingSpaceId(spaceId)
      setEditingSpaceName(currentName)
    },
    []
  )

  const saveRenameSpace = useCallback(
    async (spaceId: string) => {
      const name = editingSpaceName.trim()
      setEditingSpaceId(null)
      if (!name) return
      setSpaces(await window.brover.renameSpace({ spaceId, name }))
    },
    [editingSpaceName]
  )

  const onEditSpaceNameChange = useCallback((value: string) => {
    setEditingSpaceName(value)
  }, [])

  const addTarget = useCallback(
    async (spaceId: string) => {
      const existingNames = new Set(
        targets
          .filter((item) => item.spaceId === spaceId)
          .map((item) => item.name.trim().toLowerCase())
      )
      const baseName = 'env'
      let name = baseName
      let index = 1
      while (existingNames.has(name.toLowerCase())) {
        name = `${baseName}-${index}`
        index += 1
      }

      const updated = await window.brover.createTarget({ spaceId, name })
      setTargets((prev) => [
        ...prev.filter((item) => item.spaceId !== spaceId),
        ...updated,
      ])
      const created = updated.find((item) => item.name === name)
      if (!created) return
      setEditingTargetId(created.id)
      setEditingName('')
    },
    [targets]
  )

  const deleteTarget = useCallback(
    async (targetId: string) => {
      const target = targets.find((item) => item.id === targetId)
      if (!target) return
      const api = window.brover as typeof window.brover & {
        deleteTarget?: (payload: {
          targetId: string
        }) => Promise<typeof targets>
      }
      if (!api.deleteTarget) {
        throw new Error('deleteTarget API unavailable. Reload app window.')
      }
      const updated = await api.deleteTarget({ targetId })
      setTargets((prev) => [
        ...prev.filter((item) => item.spaceId !== target.spaceId),
        ...updated,
      ])
      if (selectedTargetId === targetId) {
        const next = updated.find((item) => item.isActive) ?? updated[0]
        setSelectedTargetId(next?.id ?? null)
      }
    },
    [selectedTargetId, targets]
  )

  const saveTargetRename = useCallback(
    async (targetId: string) => {
      const name = editingName.trim()
      setEditingTargetId(null)
      if (!name) return
      const target = targets.find((item) => item.id === targetId)
      if (!target) return
      const updated = await window.brover.renameTarget({ targetId, name })
      setTargets((prev) => [
        ...prev.filter((item) => item.spaceId !== target.spaceId),
        ...updated,
      ])
    },
    [editingName, targets]
  )

  const updateTargetColor = useCallback(
    async (targetId: string, color: string) => {
      const target = targets.find((item) => item.id === targetId)
      if (!target) return
      const updated = await window.brover.setTargetColor({ targetId, color })
      setTargets((prev) => [
        ...prev.filter((item) => item.spaceId !== target.spaceId),
        ...updated,
      ])
    },
    [targets]
  )

  const reorderTargets = useCallback(
    async (spaceId: string, orderedTargetIds: string[]) => {
      const updated = await window.brover.reorderTargets({
        spaceId,
        orderedTargetIds,
      })
      setTargets((prev) => [
        ...prev.filter((item) => item.spaceId !== spaceId),
        ...updated,
      ])
    },
    []
  )

  const deleteSpace = useCallback(
    async (spaceId: string) => {
      const api = window.brover as typeof window.brover & {
        deleteSpace?: (spaceId: string) => Promise<EnvSpace[]>
      }
      if (!api.deleteSpace) {
        throw new Error('deleteSpace API unavailable. Reload app window.')
      }
      const nextSpaces = await api.deleteSpace(spaceId)
      setSpaces(nextSpaces)
      setTargets((prev) => prev.filter((item) => item.spaceId !== spaceId))
      if (selectedSpaceId === spaceId) {
        const fallbackSpace = nextSpaces[0] ?? null
        setSelectedSpaceId(fallbackSpace?.id ?? null)
        if (fallbackSpace) {
          const fallbackTargets = targets.filter(
            (item) => item.spaceId === fallbackSpace.id
          )
          setSelectedTargetId(
            fallbackTargets.find((item) => item.isActive)?.id ??
              fallbackTargets[0]?.id ??
              null
          )
        } else {
          setSelectedTargetId(null)
        }
      }
    },
    [selectedSpaceId, targets]
  )

  const toggleSpaceTiedSecrets = useCallback(async (spaceId: string) => {
    setSpaces(await window.brover.toggleSpaceTiedSecrets(spaceId))
  }, [])

  const setActiveTarget = useCallback(
    async (spaceId: string, targetId: string) => {
      const updated = await window.brover.setActiveTarget({ spaceId, targetId })
      setTargets((prev) => [
        ...prev.filter((item) => item.spaceId !== spaceId),
        ...updated,
      ])
      setSelectedSpaceId(spaceId)
      setSelectedTargetId(targetId)
    },
    []
  )

  const onSearchChange = useCallback((value: string) => {
    setSearchText(value)
  }, [])

  return (
    <div className="relative grid h-screen grid-cols-[320px_1fr_1fr] grid-rows-[52px_1fr] gap-0 text-sm">
      {/* Drag bars */}
      <div
        data-testid="drag-bar"
        className="absolute inset-x-0 top-0 z-50 h-11 w-20"
        style={DRAG_REGION_STYLE}
      />
      <div
        data-testid="drag-bar"
        className="absolute inset-x-0 top-0 w-full right-0 z-50 h-4"
        style={DRAG_REGION_STYLE}
      />

      <div className="col-start-1 col-end-2 row-start-1 row-end-3">
        <SpacesSidebar
          title={t('app.title')}
          subtitle={t('app.subtitle')}
          spaces={spaces}
          targetsBySpace={targetsBySpace}
          selectedSpaceId={selectedSpaceId}
          selectedTargetId={selectedTargetId}
          editingSpaceId={editingSpaceId}
          editingSpaceName={editingSpaceName}
          editingTargetId={editingTargetId}
          editingName={editingName}
          locale={locale}
          onLocaleChange={setLocale}
          onEditNameChange={setEditingName}
          onAddSpace={() => void addSpace()}
          onStartRenameSpace={startRenameSpace}
          onSaveRenameSpace={(spaceId) => void saveRenameSpace(spaceId)}
          onEditSpaceNameChange={onEditSpaceNameChange}
          onSelectSpace={(spaceId, firstTargetId) => {
            setSelectedSpaceId(spaceId)
            const currentBelongsToSpace = targets.some(
              (target) =>
                target.id === selectedTargetId && target.spaceId === spaceId
            )
            if (!currentBelongsToSpace && firstTargetId) {
              setSelectedTargetId(firstTargetId)
            }
          }}
          onAddTarget={(spaceId) => void addTarget(spaceId)}
          onStartRenameTarget={(targetId, currentName) => {
            setEditingTargetId(targetId)
            setEditingName(currentName)
          }}
          onSaveRenameTarget={(targetId) => void saveTargetRename(targetId)}
          onSelectTarget={(spaceId, targetId) =>
            void setActiveTarget(spaceId, targetId)
          }
          onUpdateTargetColor={(targetId, color) =>
            void updateTargetColor(targetId, color)
          }
          onReorderTargets={(spaceId, orderedTargetIds) =>
            void reorderTargets(spaceId, orderedTargetIds)
          }
          onDeleteTarget={(targetId) => void deleteTarget(targetId)}
          onDeleteSpace={(spaceId) => void deleteSpace(spaceId)}
          onToggleSpaceTiedSecrets={(spaceId) =>
            void toggleSpaceTiedSecrets(spaceId)
          }
        />
      </div>

      <div className="col-start-2 col-end-4 row-start-1 row-end-2 bg-panel/85 border-b border-edge/60">
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

      <div className="col-start-2 col-end-3 row-start-2 row-end-3">
        <SecretsCenterPanel>{secretsPanel.center}</SecretsCenterPanel>
      </div>

      <div className="col-start-3 col-end-4 row-start-2 row-end-3">
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
  const [onboardingStatus, setOnboardingStatus] = useState<
    'loading' | 'pending' | 'done'
  >('loading')

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
          <OnboardingFlow
            onComplete={() => setOnboardingStatus('done')}
          />
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
