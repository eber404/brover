import { useState } from 'react'
import type { EnvMetadata } from '../../../../shared/models'
import { UNSUPPORTED_SECRET_BACKEND } from '../../../../shared/models'
import { Copy, Eye, Trash2, RefreshCw } from 'lucide-react'
import { useI18n } from '../../i18n'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Switch } from '../../components/ui/switch'

interface SecretsDetailProps {
  env: EnvMetadata | null
  enabled: boolean
  revealValue: string
  onReveal: () => void
  onCopy: () => void
  onToggleEnabled: () => void
  onDelete: () => void
  onUpdateValue: (value: string) => void
}

export function SecretsDetail({
  env,
  enabled,
  revealValue,
  onReveal,
  onCopy,
  onToggleEnabled,
  onDelete,
  onUpdateValue
}: SecretsDetailProps) {
  const { t } = useI18n()
  const [editValue, setEditValue] = useState('')

  if (!env) {
    return <p className="text-slate-400">{t('secrets.selectSecret')}</p>
  }

  return (
    <div className="grid gap-3">
      <div>
        <div className="text-lg font-semibold">{env.name}</div>
        <div className="text-xs text-slate-400">{t('common.profile')}: {env.profile}</div>
      </div>

      <div className="flex items-center gap-3">
        <Switch checked={enabled} onCheckedChange={() => onToggleEnabled()} />
        <span className="text-sm text-slate-300">{enabled ? t('secrets.enabled') : t('secrets.disabled')}</span>
      </div>

      <Button variant="outline" onClick={() => onReveal()}>
        <Eye className="mr-2 h-4 w-4" />
        {t('secrets.revealSecret')}
      </Button>
      <Button variant="outline" onClick={() => onCopy()}>
        <Copy className="mr-2 h-4 w-4" />
        {t('secrets.copySecret')}
      </Button>

      <div className="grid gap-2">
        <Input placeholder={t('secrets.secretValue')} value={editValue} onChange={(event) => setEditValue(event.target.value)} />
        <Button variant="outline" onClick={() => { onUpdateValue(editValue); setEditValue('') }}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {t('secrets.updateValue')}
        </Button>
      </div>

      <Button variant="destructive" onClick={() => onDelete()}>
        <Trash2 className="mr-2 h-4 w-4" />
        {t('secrets.deleteSecret')}
      </Button>

      {revealValue && <div className="rounded-lg border border-edge bg-slate-950/60 p-3 font-mono text-xs">{revealValue}</div>}
    </div>
  )
}
