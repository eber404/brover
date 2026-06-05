import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { KeyRound, Plus } from 'lucide-react'
import type { EnvMetadata } from '../../../../shared/models'
import { UNSUPPORTED_SECRET_BACKEND } from '../../../../shared/models'
import { useI18n } from '../../i18n'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog'
import { ConfirmDialog } from '../../components/ui/confirmDialog'
import { Input } from '../../components/ui/input'
import { useToast } from '../../components/ui/toaster'

interface SecretsPanelProps {
  selectedTargetId: string | null
  targetName: string
  envs: EnvMetadata[]
  filteredEnvs: EnvMetadata[]
  selectedEnvId: string
  searchQuery?: string
  setSelectedEnvId: (value: string) => void
  setEnvs: (items: EnvMetadata[]) => void
  setRevealValue: (value: string) => void
}

interface SecretRowProps {
  item: EnvMetadata
  isSelected: boolean
  onSelect: (id: string) => void
}

const SecretRow = memo(function SecretRow(props: SecretRowProps) {
  const { item, isSelected, onSelect } = props

  return (
    <button
      data-testid={`secret-row-${item.name}`}
      className={`flex items-center gap-3 rounded-xl border p-3 text-left ${isSelected ? 'border-accent bg-surface-active' : 'border-edge bg-surface-card'}`}
      onClick={() => onSelect(item.id)}
    >
      <KeyRound className="h-5 w-5 shrink-0 text-text-muted" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold">{item.name}</span>
        </div>
        <div className="truncate text-xs text-text-muted">{item.description || 'No description'}</div>
      </div>
    </button>
  )
})

export function useSecretsPanel(props: SecretsPanelProps) {
  const { t } = useI18n()
  const {
    selectedTargetId,
    targetName,
    envs,
    filteredEnvs,
    selectedEnvId,
    searchQuery,
    setSelectedEnvId,
    setEnvs,
    setRevealValue,
  } = props

  const { toast } = useToast()
  const expirationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (expirationTimerRef.current !== null) {
        clearTimeout(expirationTimerRef.current)
      }
    }
  }, [])

  function scheduleExpiration(expiresAt: number) {
    if (expirationTimerRef.current !== null) {
      clearTimeout(expirationTimerRef.current)
    }
    const ms = expiresAt - Date.now()
    if (ms <= 0) return
    expirationTimerRef.current = setTimeout(() => {
      setRevealValue('')
      expirationTimerRef.current = null
    }, ms)
  }

  const [open, setOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [updateConfirmOpen, setUpdateConfirmOpen] = useState(false)
  const [pendingUpdateValue, setPendingUpdateValue] = useState('')
  const [newEnvName, setNewEnvName] = useState('')
  const [newEnvValue, setNewEnvValue] = useState('')
  const [newEnvDescription, setNewEnvDescription] = useState('')
  const [hasValue, setHasValue] = useState(true)
  const selectedEnv = useMemo(
    () => envs.find((item) => item.id === selectedEnvId) ?? null,
    [envs, selectedEnvId]
  )

  useEffect(() => {
    if (!selectedEnv) return
    window.brover.secretExists(selectedEnv.profile, selectedEnv.name).then(setHasValue)
  }, [selectedEnv])

  const onSelectEnv = useCallback(
    (id: string) => {
      setSelectedEnvId(id)
    },
    [setSelectedEnvId]
  )

  function normalizeEnvNameInput(value: string) {
    return value.toUpperCase().replace(/[-\s]+/g, '_')
  }

  async function createEnv() {
    if (!selectedTargetId) return
    const result = await window.brover.createEnv({
      name: newEnvName.trim().toUpperCase(),
      profile: selectedTargetId,
      value: newEnvValue,
      description: newEnvDescription,
    })
    if (!result.ok) {
      toast(
        result.error === UNSUPPORTED_SECRET_BACKEND
          ? t('common.unsupportedBackend')
          : (result.error ?? 'Failed to create secret'),
        'error'
      )
      return
    }
    setOpen(false)
    setNewEnvName('')
    setNewEnvValue('')
    setNewEnvDescription('')
    setEnvs(await window.brover.listEnvs())
    toast(t('common.secretCreated'))
  }

  async function revealEnv() {
    if (!selectedEnv) return
    setRevealValue('')
    if (expirationTimerRef.current !== null) {
      clearTimeout(expirationTimerRef.current)
      expirationTimerRef.current = null
    }
    const result = await window.brover.revealEnv({
      profile: selectedEnv.profile,
      name: selectedEnv.name,
    })
    if (!result.ok) {
      toast(
        result.error === UNSUPPORTED_SECRET_BACKEND
          ? t('common.unsupportedBackend')
          : (result.error ?? 'Failed to reveal secret'),
        'error'
      )
      setRevealValue('')
      return
    }
    setRevealValue(result.value ?? '')
    if (result.expiresAt) {
      scheduleExpiration(result.expiresAt)
    }
  }

  async function copyEnv(isRevealed: boolean) {
    if (!selectedEnv) return
    const result = await window.brover.copyEnv({
      profile: selectedEnv.profile,
      name: selectedEnv.name,
      isRevealed,
    })
    if (!result.ok) {
      toast(
        result.error === UNSUPPORTED_SECRET_BACKEND
          ? t('common.unsupportedBackend')
          : (result.error ?? 'Failed to copy secret'),
        'error'
      )
      return
    }
    const value = result.value ?? ''
    await navigator.clipboard.writeText(value)
    toast(t('common.secretCopied'))
  }

  async function updateEnvValue(editedValue: string) {
    if (!selectedEnv) return
    const result = await window.brover.updateEnv({
      id: selectedEnv.id,
      profile: selectedEnv.profile,
      name: selectedEnv.name,
      value: editedValue,
      description: selectedEnv.description,
    })
    if (!result.ok) {
      toast(
        result.error === UNSUPPORTED_SECRET_BACKEND
          ? t('common.unsupportedBackend')
          : (result.error ?? 'Failed to update secret'),
        'error'
      )
      return
    }
    if (result.value === 'needs-confirmation') {
      setPendingUpdateValue(editedValue)
      setUpdateConfirmOpen(true)
      return
    }
    setRevealValue('')
    toast(t('common.secretUpdated'))
    if (selectedEnv) {
      window.brover.secretExists(selectedEnv.profile, selectedEnv.name).then(setHasValue)
    }
  }

  async function updateEnvConfirmed() {
    if (!selectedEnv || !pendingUpdateValue) return
    const result = await window.brover.updateEnvConfirmed({
      id: selectedEnv.id,
      profile: selectedEnv.profile,
      name: selectedEnv.name,
      value: pendingUpdateValue,
      description: selectedEnv.description,
    })
    if (!result.ok) {
      toast(
        result.error === UNSUPPORTED_SECRET_BACKEND
          ? t('common.unsupportedBackend')
          : (result.error ?? 'Failed to update secret'),
        'error'
      )
      return
    }
    setUpdateConfirmOpen(false)
    setPendingUpdateValue('')
    setRevealValue('')
    toast(t('common.secretUpdated'))
    window.brover.secretExists(selectedEnv.profile, selectedEnv.name).then(setHasValue)
  }

  async function deleteEnv() {
    if (!selectedEnv) return
    const result = await window.brover.deleteEnv({
      id: selectedEnv.id,
      profile: selectedEnv.profile,
      name: selectedEnv.name,
    })
    if (!result.ok) {
      toast(
        result.error === UNSUPPORTED_SECRET_BACKEND
          ? t('common.unsupportedBackend')
          : (result.error ?? 'Failed to delete secret'),
        'error'
      )
      return
    }
    if (result.value === 'needs-confirmation') {
      setDeleteConfirmOpen(true)
      return
    }
    setEnvs(await window.brover.listEnvs())
    setSelectedEnvId('')
    setRevealValue('')
    toast(t('common.secretDeleted'))
  }

  async function deleteEnvConfirmed() {
    if (!selectedEnv) return
    const result = await window.brover.deleteEnvConfirmed({
      id: selectedEnv.id,
      profile: selectedEnv.profile,
      name: selectedEnv.name,
    })
    if (!result.ok) {
      toast(
        result.error === UNSUPPORTED_SECRET_BACKEND
          ? t('common.unsupportedBackend')
          : (result.error ?? 'Failed to delete secret'),
        'error'
      )
      return
    }
    setDeleteConfirmOpen(false)
    setEnvs(await window.brover.listEnvs())
    setSelectedEnvId('')
    setRevealValue('')
    toast(t('common.secretDeleted'))
  }

  let listContent: ReactNode
  const isFiltered = (searchQuery ?? '').trim().length > 0
  if (filteredEnvs.length === 0) {
    if (isFiltered) {
      listContent = (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-edge bg-surface-card p-4 text-center">
          <KeyRound className="h-6 w-6 text-text-muted" />
          <div className="text-sm font-medium text-text-base">{t('secrets.noResults')}</div>
        </div>
      )
    } else {
      listContent = (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-edge bg-surface-card p-4 text-center">
          <KeyRound className="h-6 w-6 text-text-muted" />
          <div className="text-sm font-medium text-text-base">{t('secrets.noSecrets')}</div>
        </div>
      )
    }
  } else {
    listContent = (
      <div className="grid gap-2">
        {filteredEnvs.map((item) => (
          <SecretRow
            key={item.id}
            item={item}
            isSelected={selectedEnvId === item.id}
            onSelect={onSelectEnv}
          />
        ))}
      </div>
    )
  }

  return {
    center: (
      <>
        <Card className="mb-3 border-transparent bg-transparent p-0">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-text-emphasis">{targetName}</h2>
            <div className="flex items-center gap-2">
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button
                    data-testid="add-secret-button"
                    variant="card"
                    className="px-4 py-2 text-sm font-semibold"
                  >
                    <span className="flex items-center gap-2">
                      <Plus className="h-4 w-4 text-accent transition-all duration-200 group-hover:scale-110" />
                      {t('secrets.addSecret')}
                    </span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('secrets.dialogTitle')}</DialogTitle>
                    <DialogDescription>
                      {t('secrets.dialogDescription')}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-2">
                    <Input
                      data-testid="add-secret-name"
                      placeholder={t('secrets.envName')}
                      value={newEnvName}
                      onChange={(event) =>
                        setNewEnvName(normalizeEnvNameInput(event.target.value))
                      }
                    />
                    <Input
                      data-testid="add-secret-value"
                      placeholder={t('secrets.secretValue')}
                      value={newEnvValue}
                      onChange={(event) => setNewEnvValue(event.target.value)}
                    />
                    <textarea
                      data-testid="add-secret-description"
                      className="min-h-20 w-full rounded-lg border border-edge bg-slate-900 px-3 py-2 text-sm text-text-emphasis outline-none placeholder:text-text-muted"
                      placeholder={t('secrets.description')}
                      value={newEnvDescription}
                      onChange={(event) =>
                        setNewEnvDescription(event.target.value)
                      }
                    />
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <DialogClose asChild>
                      <Button variant="outline">{t('secrets.cancel')}</Button>
                    </DialogClose>
                    <Button data-testid="add-secret-submit" onClick={() => void createEnv()}>
                      {t('secrets.create')}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </Card>

        {listContent}

        <ConfirmDialog
          open={updateConfirmOpen}
          onOpenChange={setUpdateConfirmOpen}
          title={`Update "${selectedEnv?.name}"?`}
          description="This will replace the current secret value."
          confirmLabel="Update"
          cancelLabel="Cancel"
          onConfirm={() => void updateEnvConfirmed()}
        />

        <ConfirmDialog
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
          title={`Delete "${selectedEnv?.name}"?`}
          description="This cannot be undone."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          destructive
          onConfirm={() => void deleteEnvConfirmed()}
        />
      </>
    ),
    selectedEnv,
    hasValue,
    revealEnv,
    copyEnv,
    updateEnvValue,
    updateEnvConfirmed,
    deleteEnv,
    deleteEnvConfirmed,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
  }
}
