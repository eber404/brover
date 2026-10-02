import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Copy, KeyRound, Plus } from 'lucide-react'
import type { EnvMetadata } from '../../../../shared/models'
import { AUTH_CANCELED, UNSUPPORTED_SECRET_BACKEND } from '../../../../shared/models'
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
import { Input } from '../../components/ui/input'
import { useToast } from '../../components/ui/toaster'

interface SecretsPanelProps {
  selectedEnvironmentId: string | null
  environmentName: string
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
  onCopy: (item: EnvMetadata) => void
  onCopyName: (name: string) => void
}

const SecretRow = memo(function SecretRow(props: SecretRowProps) {
  const { item, isSelected, onSelect, onCopy, onCopyName } = props
  const { t } = useI18n()
  const copyLabel = `${t('secrets.copySecret')}: ${item.name}`
  const copyNameLabel = `${t('secrets.copyVariableName')}: ${item.name}`

  return (
    <div
      className={`group flex items-center gap-3 rounded-xl border p-3 text-left cursor-pointer ${isSelected ? 'border-accent bg-surface-active' : 'border-edge bg-surface-card'}`}
      onClick={() => onSelect(item.id)}
    >
      <KeyRound className="h-5 w-5 shrink-0 text-text-muted" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span
            data-testid={`secret-row-${item.name}`}
            className="min-w-0 truncate font-semibold"
          >
            {item.name}
          </span>
          <button
            type="button"
            data-testid={`secret-copy-name-${item.name}`}
            aria-label={copyNameLabel}
            title={copyNameLabel}
            className="shrink-0 rounded-md p-1 text-text-muted opacity-0 transition-opacity hover:bg-surface-active hover:text-text-base group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            onClick={(event) => {
              event.stopPropagation()
              onCopyName(item.name)
            }}
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="truncate text-xs text-text-muted">{item.description || 'No description'}</div>
      </div>
      <button
        type="button"
        data-testid={`secret-copy-${item.name}`}
        aria-label={copyLabel}
        title={copyLabel}
        className="shrink-0 rounded-lg p-2 text-text-muted hover:bg-surface-active hover:text-text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        onClick={(event) => {
          event.stopPropagation()
          onCopy(item)
        }}
      >
        <Copy className="h-4 w-4" />
      </button>
    </div>
  )
})

export function useSecretsPanel(props: SecretsPanelProps) {
  const { t } = useI18n()
  const {
    selectedEnvironmentId,
    environmentName,
    envs,
    filteredEnvs,
    selectedEnvId,
    searchQuery,
    setSelectedEnvId,
    setEnvs,
    setRevealValue,
  } = props

  const { toast } = useToast()
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

  const closeUpdateConfirmation = useCallback((open: boolean) => {
    setUpdateConfirmOpen(open)
    if (!open) setPendingUpdateValue('')
  }, [])

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
    if (!selectedEnvironmentId) return
    const result = await window.brover.createEnv({
      name: newEnvName.trim().toUpperCase(),
      profile: selectedEnvironmentId,
      value: newEnvValue,
      description: newEnvDescription,
    })
    if (!result.ok && result.error === AUTH_CANCELED) return
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
    if (!selectedEnv) return false
    setRevealValue('')
    const result = await window.brover.revealEnv({
      profile: selectedEnv.profile,
      name: selectedEnv.name,
    })
    if (!result.ok && result.error === AUTH_CANCELED) {
      setRevealValue('')
      return false
    }
    if (!result.ok) {
      setRevealValue('')
      toast(
        result.error === UNSUPPORTED_SECRET_BACKEND
          ? t('common.unsupportedBackend')
          : (result.error ?? 'Failed to reveal secret'),
        'error'
      )
      return false
    }
    setRevealValue(result.value ?? '')
    return true
  }

  const copyEnv = useCallback(async (isRevealed: boolean, env = selectedEnv) => {
    if (!env) return
    const result = await window.brover.copyEnv({
      profile: env.profile,
      name: env.name,
      isRevealed,
    })
    if (!result.ok && result.error === AUTH_CANCELED) return
    if (!result.ok) {
      toast(
        result.error === UNSUPPORTED_SECRET_BACKEND
          ? t('common.unsupportedBackend')
          : (result.error ?? 'Failed to copy secret'),
        'error'
      )
      return
    }
    toast(t('common.secretCopied'))
  }, [selectedEnv, t, toast])

  const onCopyEnv = useCallback(
    (env: EnvMetadata) => {
      void copyEnv(false, env)
    },
    [copyEnv]
  )

  const copyEnvName = useCallback(async (name: string) => {
    try {
      await navigator.clipboard.writeText(name)
    } catch {
      toast(t('secrets.copyVariableNameFailed'), 'error')
      return
    }
    toast(t('secrets.variableNameCopied'))
  }, [t, toast])

  const onCopyEnvName = useCallback(
    (name: string) => {
      void copyEnvName(name)
    },
    [copyEnvName]
  )

  async function updateEnvValue(editedValue: string) {
    if (!selectedEnv) return
    const result = await window.brover.updateEnv({
      id: selectedEnv.id,
      profile: selectedEnv.profile,
      name: selectedEnv.name,
      value: editedValue,
      description: selectedEnv.description,
    })
    if (!result.ok && result.error === AUTH_CANCELED) return
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
    setRevealValue(editedValue)
    setHasValue(true)
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
    if (!result.ok && result.error === AUTH_CANCELED) return
    if (!result.ok) {
      toast(
        result.error === UNSUPPORTED_SECRET_BACKEND
          ? t('common.unsupportedBackend')
          : (result.error ?? 'Failed to update secret'),
        'error'
      )
      throw new Error(result.error ?? 'Failed to update secret')
    }
    setRevealValue(pendingUpdateValue)
    setHasValue(true)
    toast(t('common.secretUpdated'))
  }

  async function deleteEnv() {
    if (!selectedEnv) return
    const result = await window.brover.deleteEnv({
      id: selectedEnv.id,
      profile: selectedEnv.profile,
      name: selectedEnv.name,
    })
    if (!result.ok && result.error === AUTH_CANCELED) return
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
    if (!result.ok && result.error === AUTH_CANCELED) return
    if (!result.ok) {
      toast(
        result.error === UNSUPPORTED_SECRET_BACKEND
          ? t('common.unsupportedBackend')
          : (result.error ?? 'Failed to delete secret'),
        'error'
      )
      throw new Error(result.error ?? 'Failed to delete secret')
    }
    setEnvs(await window.brover.listEnvs())
    setSelectedEnvId('')
    setRevealValue('')
    toast(t('common.secretDeleted'))
  }

  let listContent: ReactNode
  const isFiltered = (searchQuery ?? '').trim().length > 0
  if (filteredEnvs.length === 0) {
    const emptyStateLabel = isFiltered ? t('secrets.noResults') : t('secrets.noSecrets')
    listContent = (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-edge bg-surface-card p-4 text-center">
        <KeyRound className="h-6 w-6 text-text-muted" />
        <div className="text-sm font-medium text-text-base">{emptyStateLabel}</div>
      </div>
    )
  } else {
    listContent = (
      <div className="grid gap-2">
        {filteredEnvs.map((item) => (
          <SecretRow
            key={item.id}
            item={item}
            isSelected={selectedEnvId === item.id}
            onSelect={onSelectEnv}
            onCopy={onCopyEnv}
            onCopyName={onCopyEnvName}
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
            <h2 className="text-lg font-semibold text-text-emphasis">{environmentName}</h2>
            
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
                      className="min-h-20 w-full rounded-lg border border-edge bg-slate-900 px-3 py-2 text-sm text-text-emphasis placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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

      </>
    ),
    selectedEnv,
    hasValue,
    revealEnv,
    copyEnv,
    updateEnvValue,
    updateEnvConfirmed,
    updateConfirmOpen,
    closeUpdateConfirmation,
    deleteEnv,
    deleteEnvConfirmed,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
  }
}
