import { useState } from 'react'
import type { EnvMetadata, Profile } from '../../../../shared/models'
import { UNSUPPORTED_SECRET_BACKEND } from '../../../../shared/models'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'

interface SecretsPanelProps {
  profiles: Profile[]
  selectedProfile: Profile | undefined
  envs: EnvMetadata[]
  filteredEnvs: EnvMetadata[]
  selectedEnvId: string
  setSelectedEnvId: (value: string) => void
  setProfiles: (items: Profile[]) => void
  setEnvs: (items: EnvMetadata[]) => void
  setMessage: (value: string) => void
  setRevealValue: (value: string) => void
}

export function useSecretsPanel(props: SecretsPanelProps) {
  const {
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
  } = props

  const [open, setOpen] = useState(false)
  const [newProfileName, setNewProfileName] = useState('')
  const [newEnvName, setNewEnvName] = useState('')
  const [newEnvValue, setNewEnvValue] = useState('')
  const [newEnvDescription, setNewEnvDescription] = useState('')
  const [editedValue, setEditedValue] = useState('')

  const selectedEnv = envs.find((item) => item.id === selectedEnvId) ?? null

  async function createProfile() {
    const next = await window.brover.createProfile(newProfileName)
    setProfiles(next)
    setNewProfileName('')
  }

  async function createEnv() {
    if (!selectedProfile) return
    const result = await window.brover.createEnv({
      name: newEnvName.trim().toUpperCase(),
      profile: selectedProfile.name,
      value: newEnvValue,
      description: newEnvDescription
    })
    if (!result.ok) {
      setMessage(result.error === UNSUPPORTED_SECRET_BACKEND ? 'Secure storage not implemented for this OS yet.' : result.error ?? 'Failed to create secret')
      return
    }
    setOpen(false)
    setNewEnvName('')
    setNewEnvValue('')
    setNewEnvDescription('')
    setEnvs(await window.brover.listEnvs())
    setMessage('Secret created')
  }

  async function revealEnv() {
    if (!selectedEnv) return
    const result = await window.brover.revealEnv({ profile: selectedEnv.profile, name: selectedEnv.name })
    if (!result.ok) {
      setMessage(result.error === UNSUPPORTED_SECRET_BACKEND ? 'Secure storage not implemented for this OS yet.' : result.error ?? 'Failed to reveal secret')
      setRevealValue('')
      return
    }
    setRevealValue(result.value ?? '')
  }

  async function copyEnv() {
    if (!selectedEnv) return
    const result = await window.brover.revealEnv({ profile: selectedEnv.profile, name: selectedEnv.name })
    if (!result.ok) {
      setMessage(result.error === UNSUPPORTED_SECRET_BACKEND ? 'Secure storage not implemented for this OS yet.' : result.error ?? 'Failed to copy secret')
      return
    }
    const value = result.value ?? ''
    await navigator.clipboard.writeText(value)
    setMessage('Secret copied')
  }

  async function updateEnvValue() {
    if (!selectedEnv) return
    const result = await window.brover.updateEnv({
      id: selectedEnv.id,
      profile: selectedEnv.profile,
      name: selectedEnv.name,
      value: editedValue,
      description: selectedEnv.description,
      enabled: selectedEnv.enabled
    })
    if (!result.ok) {
      setMessage(result.error === UNSUPPORTED_SECRET_BACKEND ? 'Secure storage not implemented for this OS yet.' : result.error ?? 'Failed to update secret')
      return
    }
    setEditedValue('')
    setMessage('Secret updated')
  }

  async function deleteEnv() {
    if (!selectedEnv) return
    const result = await window.brover.deleteEnv({ id: selectedEnv.id, profile: selectedEnv.profile, name: selectedEnv.name })
    if (!result.ok) {
      setMessage(result.error === UNSUPPORTED_SECRET_BACKEND ? 'Secure storage not implemented for this OS yet.' : result.error ?? 'Failed to delete secret')
      return
    }
    setEnvs(await window.brover.listEnvs())
    setSelectedEnvId('')
  }

  return {
    center: (
      <>
        <Card className="mb-4 grid gap-2">
          <div className="flex gap-2">
            <select className="w-full rounded-lg border border-edge bg-slate-900 px-3 py-2" value={selectedProfile?.id ?? ''} onChange={(event) => void window.brover.setActiveProfile(event.target.value).then(setProfiles)}>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>{profile.name}</option>
              ))}
            </select>
            <Input className="w-full" placeholder="New profile" value={newProfileName} onChange={(event) => setNewProfileName(event.target.value)} />
            <Button variant="outline" onClick={() => void createProfile()}>Create</Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>Add Secret</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Secret</DialogTitle>
                  <DialogDescription>Create metadata + store secret value in secure backend.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-2">
                  <Input placeholder="Env name (OPENAI_API_KEY)" value={newEnvName} onChange={(event) => setNewEnvName(event.target.value)} />
                  <Input placeholder="Secret value" value={newEnvValue} onChange={(event) => setNewEnvValue(event.target.value)} />
                  <Input placeholder="Description (optional)" value={newEnvDescription} onChange={(event) => setNewEnvDescription(event.target.value)} />
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button onClick={() => void createEnv()}>Create</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </Card>

        <div className="grid gap-2">
          {filteredEnvs.map((item) => (
            <button key={item.id} className={`rounded-xl border p-3 text-left ${selectedEnvId === item.id ? 'border-accent bg-slate-900' : 'border-edge bg-slate-950/30'}`} onClick={() => setSelectedEnvId(item.id)}>
              <div className="font-semibold">{item.name}</div>
              <div className="text-xs text-slate-400">{item.description || 'No description'}</div>
            </button>
          ))}
        </div>
      </>
    ),
    selectedEnv,
    editedValue,
    setEditedValue,
    revealEnv,
    copyEnv,
    updateEnvValue,
    deleteEnv
  }
}
