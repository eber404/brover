import { useEffect, useState } from 'react'
import type { EnvMetadata } from '../../../../shared/models'
import { Copy, Eye, EyeOff, RotateCw } from 'lucide-react'
import { useI18n } from '../../i18n'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'

interface SecretsDetailProps {
  env: EnvMetadata | null
  targetName: string
  revealValue: string
  hasValue: boolean
  onReveal: () => void
  onCopy: (isRevealed: boolean) => void
  onUpdateValue: (value: string) => void
}

export function SecretsDetail({
  env,
  targetName,
  revealValue,
  hasValue,
  onReveal,
  onCopy,
  onUpdateValue
}: SecretsDetailProps) {
  const { t } = useI18n()
  const [editValue, setEditValue] = useState('')
  const [isRevealed, setIsRevealed] = useState(false)

  useEffect(() => {
    setIsRevealed(false)
  }, [env?.id])

  useEffect(() => {
    setIsRevealed(Boolean(revealValue))
  }, [revealValue])

  if (!env) {
    return <p className="text-text-muted">{t('secrets.selectSecret')}</p>
  }

  const currentSecretValue = isRevealed ? revealValue : '••••••••'
  const secretAriaLabel = isRevealed ? 'Hide secret' : 'Reveal secret'
  const currentSecretTitle = hasValue ? 'Rotate Secret' : t('secrets.defineTitle')
  const updateActionLabel = hasValue ? t('secrets.updateValue') : t('secrets.saveValue')

  return (
    <div className="grid gap-3">
      <div>
        <div className="text-lg font-semibold">{env.name}</div>
        <div className="text-xs text-text-muted">Target: {targetName}</div>
      </div>

      {hasValue && (
        <div className="grid gap-2 rounded-xl border border-edge bg-surface-card p-3">
          <div className="text-xs font-semibold uppercase tracking-widest text-text-muted">Current Secret</div>
          <div className="relative">
            <Input
              readOnly
              value={currentSecretValue}
              className="pr-11 font-mono"
            />
            <button
              data-testid="secret-reveal-toggle"
              type="button"
              className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer rounded-lg p-1.5 text-text-muted transition-all duration-200 hover:bg-surface-hover hover:text-accent"
              onClick={() => {
                if (isRevealed) {
                  setIsRevealed(false)
                  return
                }
                onReveal()
              }}
              aria-label={secretAriaLabel}
            >
              {isRevealed && <EyeOff className="h-4 w-4" />}
              {!isRevealed && <Eye className="h-4 w-4" />}
            </button>
          </div>
          <Button
            data-testid="secret-copy-button"
            variant="card"
            className="w-full px-4 py-2 text-sm font-semibold active:scale-[0.98]"
            onClick={() => onCopy(isRevealed)}
          >
            <span className="flex items-center gap-2">
              <Copy className="h-4 w-4 text-accent transition-all duration-200 group-hover:text-[#67d0ff] group-hover:scale-110" />
              {t('secrets.copySecret')}
            </span>
          </Button>
        </div>
      )}

      <div className="grid gap-2 rounded-xl border border-edge bg-surface-card p-3">
        <div className="text-xs font-semibold uppercase tracking-widest text-text-muted">{currentSecretTitle}</div>
        <Input
          data-testid="secret-update-input"
          placeholder={t('secrets.secretValue')}
          value={editValue}
          onChange={(event) => setEditValue(event.target.value)}
        />
        <Button
          data-testid="secret-update-button"
          variant="card"
          className="w-full px-4 py-2 text-sm font-semibold active:scale-[0.98]"
          onClick={() => {
            onUpdateValue(editValue)
            setEditValue('')
          }}
          disabled={editValue.length === 0}
        >
          <span className="flex items-center gap-2">
            <RotateCw className="h-4 w-4 text-accent transition-all duration-200 group-hover:text-[#67d0ff] group-hover:scale-110" />
            {updateActionLabel}
          </span>
        </Button>
      </div>
    </div>
  )
}
