import { useEffect, useState } from 'react'
import type { EnvMetadata } from '../../../../shared/models'
import { Copy, Trash2 } from 'lucide-react'
import { useI18n } from '../../i18n'
import { useToast } from '../../components/ui/toaster'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'

interface SecretsDetailProps {
  env: EnvMetadata | null
  environmentName: string
  revealValue: string
  hasValue: boolean
  onCopy: (isRevealed: boolean) => void
  onUpdateValue: (value: string) => void
  onDelete: () => void
  canDelete: boolean
}

export function SecretsDetail({
  env,
  environmentName,
  revealValue,
  hasValue,
  onCopy,
  onUpdateValue,
  onDelete,
  canDelete
}: SecretsDetailProps) {
  const { t } = useI18n()
  const { toast } = useToast()
  const [currentValue, setCurrentValue] = useState('')
  const isRevealed = Boolean(revealValue)

  useEffect(() => {
    if (revealValue) {
      setCurrentValue(revealValue)
      return
    }
    if (hasValue) {
      setCurrentValue('••••••••')
      return
    }
    setCurrentValue('')
  }, [revealValue, hasValue])

  if (!env) {
    return <p className="text-text-muted">{t('secrets.selectSecret')}</p>
  }

  let displayValue: string
  if (isRevealed && revealValue) {
    displayValue = revealValue
  } else if (hasValue) {
    displayValue = '••••••••'
  } else {
    displayValue = ''
  }

  const isValueChanged = currentValue !== displayValue && currentValue.length > 0
  const updateLabel = hasValue ? t('secrets.rotateValue') : t('secrets.saveValue')
  const sectionTitle = hasValue ? 'Current Secret' : t('secrets.defineTitle')
  const secretName = env.name
  const copyNameLabel = `${t('secrets.copyVariableName')}: ${secretName}`

  async function copyName() {
    try {
      await navigator.clipboard.writeText(secretName)
      toast(t('secrets.variableNameCopied'))
    } catch {
      toast(t('secrets.copyVariableNameFailed'), 'error')
    }
  }

  return (
    <div className="grid gap-3">
      <div>
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-semibold">{env.name}</span>
          <button
            type="button"
            data-testid="secret-copy-name-button"
            aria-label={copyNameLabel}
            title={copyNameLabel}
            className="shrink-0 cursor-pointer rounded-md p-1 text-text-muted transition-colors hover:bg-surface-active hover:text-text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            onClick={() => void copyName()}
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="text-xs text-text-muted">{t('common.environment')}: {environmentName}</div>
      </div>

      <div className="grid gap-2 rounded-xl border border-edge bg-surface-card p-3">
        <div className="text-xs font-semibold uppercase tracking-widest text-text-muted">{sectionTitle}</div>
        <div className="relative">
          <Input
            data-testid="secret-current-input"
            value={currentValue}
            onChange={(event) => setCurrentValue(event.target.value)}
            className="pr-11 font-mono"
            placeholder={t('secrets.secretValue')}
          />
          {hasValue && (
            <Button
              data-testid="secret-copy-button"
              variant="outline"
              className="absolute top-1/2 right-2 -translate-y-1/2 text-text-muted hover:text-accent p-1"
              onClick={() => onCopy(isRevealed)}
              aria-label={t('secrets.copySecret')}
            >
              <Copy className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Button
          data-testid="secret-update-button"
          variant="card"
          className="w-full px-4 py-2 text-sm font-semibold active:scale-[0.98]"
          onClick={() => {
            onUpdateValue(currentValue)
          }}
          disabled={!isValueChanged}
        >
          <span className="flex items-center gap-2">
            <Copy className="h-4 w-4 text-accent transition-all duration-200 group-hover:text-[#67d0ff] group-hover:scale-110" />
            {updateLabel}
          </span>
        </Button>
      </div>

      {canDelete && (
        <Button
          data-testid="secret-delete-button"
          variant="destructive"
          className="w-full px-4 py-2 text-sm font-semibold active:scale-[0.98]"
          onClick={onDelete}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {t('secrets.deleteSecret')}
        </Button>
      )}
    </div>
  )
}