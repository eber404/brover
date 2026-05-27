import { useState } from 'react'
import { KeyRound, Plus } from 'lucide-react'
import type { EnvMetadata, Profile } from '../../../../shared/models'
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
import { Input } from '../../components/ui/input'
import { useToast } from '../../components/ui/toaster'

interface SecretsPanelProps {
  selectedProfile: Profile | undefined
  envs: EnvMetadata[]
  filteredEnvs: EnvMetadata[]
  selectedEnvId: string
  setSelectedEnvId: (value: string) => void
  setEnvs: (items: EnvMetadata[]) => void
  setRevealValue: (value: string) => void
}

export function useSecretsPanel(props: SecretsPanelProps) {
  const { t } = useI18n()
  const {
    selectedProfile,
    envs,
    filteredEnvs,
    selectedEnvId,
    setSelectedEnvId,
    setEnvs,
    setRevealValue,
  } = props

  const { toast } = useToast()

  const [open, setOpen] = useState(false)
  const [newEnvName, setNewEnvName] = useState('')
  const [newEnvValue, setNewEnvValue] = useState('')
  const [newEnvDescription, setNewEnvDescription] = useState('')

  const selectedEnv = envs.find((item) => item.id === selectedEnvId) ?? null

  function normalizeEnvNameInput(value: string) {
    return value.toUpperCase().replace(/[-\s]+/g, '_')
  }

  async function createEnv() {
    if (!selectedProfile) return
    const result = await window.brover.createEnv({
      name: newEnvName.trim().toUpperCase(),
      profile: selectedProfile.name,
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
      enabled: selectedEnv.enabled,
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
    toast(t('common.secretUpdated'))
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
    setEnvs(await window.brover.listEnvs())
    setSelectedEnvId('')
    toast(t('common.secretDeleted'))
  }

  return {
    center: (
      <>
        <Card className="mb-3 border-transparent bg-transparent p-0">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-100">Secrets</h2>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button data-testid="add-secret-button" className="px-3 py-1.5">
                  <Plus className="mr-2 h-4 w-4" />
                  {t('secrets.addSecret')}
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
                    className="min-h-20 w-full rounded-lg border border-edge bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-accent"
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
        </Card>

        {filteredEnvs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-edge bg-slate-950/30 p-8 text-center">
            <KeyRound className="h-10 w-10 text-slate-500" />
            <div className="text-sm font-medium text-slate-300">
              {t('secrets.noSecrets')}
            </div>
            <div className="text-xs text-slate-500">
              {t('secrets.noSecretsDescription')}
            </div>
          </div>
        ) : (
          <div className="grid gap-2">
            {filteredEnvs.map((item) => (
              <button
                key={item.id}
                data-testid={`secret-row-${item.name}`}
                className={`flex items-center gap-3 rounded-xl border p-3 text-left ${selectedEnvId === item.id ? 'border-accent bg-slate-900' : 'border-edge bg-slate-950/30'}`}
                onClick={() => setSelectedEnvId(item.id)}
              >
                <KeyRound className="h-5 w-5 shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold">{item.name}</span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${item.enabled ? 'bg-emerald-950/50 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}
                    >
                      {item.enabled
                        ? t('secrets.enabled')
                        : t('secrets.disabled')}
                    </span>
                  </div>
                  <div className="truncate text-xs text-slate-400">
                    {item.description || 'No description'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </>
    ),
    selectedEnv,
    revealEnv,
    copyEnv,
    updateEnvValue,
    deleteEnv,
  }
}
