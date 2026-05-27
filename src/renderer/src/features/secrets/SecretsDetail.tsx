import { useEffect, useState } from 'react'
import type { EnvMetadata } from '../../../../shared/models'
import { Copy, Eye, EyeOff } from 'lucide-react'
import { useI18n } from '../../i18n'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'

interface SecretsDetailProps {
  env: EnvMetadata | null
  targetName: string
  revealValue: string
  onReveal: () => void
  onCopy: (isRevealed: boolean) => void
  onUpdateValue: (value: string) => void
}

export function SecretsDetail({
  env,
  targetName,
  revealValue,
  onReveal,
  onCopy,
  onUpdateValue
}: SecretsDetailProps) {
  const { t } = useI18n()
  const [editValue, setEditValue] = useState('')
  const [isRevealed, setIsRevealed] = useState(false)
  const revealValueText = isRevealed ? revealValue : '••••••••'
  const revealAriaLabel = isRevealed ? 'Hide secret' : 'Reveal secret'
  const revealIcon = isRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />

  useEffect(() => {
    setIsRevealed(false)
  }, [env?.id])

  if (!env) {
    return <p className="text-slate-400">{t('secrets.selectSecret')}</p>
  }

  return (
    <div className="grid gap-3">
      <div>
        <div className="text-lg font-semibold">{env.name}</div>
        <div className="text-xs text-slate-400">Target: {targetName}</div>
      </div>

      <div className="grid gap-2 rounded-xl border border-edge bg-slate-950/30 p-3">
        <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">Current Secret</div>
        <div className="relative">
          <Input
            readOnly
            value={revealValueText}
            className="pr-11 font-mono"
          />
          <button
            data-testid="secret-reveal-toggle"
            type="button"
            className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 transition hover:text-slate-200"
            onClick={() => {
              if (isRevealed) {
                setIsRevealed(false)
                return
              }
              onReveal()
              setIsRevealed(true)
            }}
            aria-label={revealAriaLabel}
          >
            {revealIcon}
          </button>
        </div>
        <Button
          data-testid="secret-copy-button"
          className="w-full"
          variant="outline"
          onClick={() => onCopy(isRevealed)}
        >
          <Copy className="mr-2 h-4 w-4" />
          {t('secrets.copySecret')}
        </Button>
      </div>

      <div className="grid gap-2 rounded-xl border border-edge bg-slate-950/30 p-3">
        <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">Rotate Secret</div>
        <Input
          data-testid="secret-update-input"
          placeholder={t('secrets.secretValue')}
          value={editValue}
          onChange={(event) => setEditValue(event.target.value)}
        />
        <Button
          data-testid="secret-update-button"
          variant="outline"
          onClick={() => {
            onUpdateValue(editValue)
            setEditValue('')
          }}
          disabled={editValue.length === 0}
        >
          {t('secrets.updateValue')}
        </Button>
      </div>
    </div>
  )
}
