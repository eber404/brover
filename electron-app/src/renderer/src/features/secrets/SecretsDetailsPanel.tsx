import { memo } from 'react'
import type { EnvMetadata } from '../../../../shared/models'
import { Button } from '../../components/ui/button'
import { SecretsDetail } from './SecretsDetail'

interface SecretsDetailsPanelProps {
  title: string
  env: EnvMetadata | null
  targetName: string
  enabled: boolean
  revealValue: string
  onReveal: () => void
  onCopy: (isRevealed: boolean) => void
  onToggleEnabled: () => void
  onUpdateValue: (value: string) => void
  onApply: () => void
  applyLabel: string
  canApply: boolean
  onDelete: () => void
  canDelete: boolean
  deleteLabel: string
}

export const SecretsDetailsPanel = memo(function SecretsDetailsPanel(props: SecretsDetailsPanelProps) {
  const {
    title,
    env,
    targetName,
    enabled,
    revealValue,
    onReveal,
    onCopy,
    onToggleEnabled,
    onUpdateValue,
    onApply,
    applyLabel,
    canApply,
    onDelete,
    canDelete,
    deleteLabel,
  } = props

  return (
    <section className="flex flex-col rounded-2xl border border-edge bg-panel/80 p-4 pt-6">
      <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">{title}</div>
      <div className="flex-1 overflow-y-auto">
        <SecretsDetail
          env={env}
          targetName={targetName}
          enabled={enabled}
          revealValue={revealValue}
          onReveal={onReveal}
          onCopy={onCopy}
          onToggleEnabled={onToggleEnabled}
          onUpdateValue={onUpdateValue}
        />
      </div>

      <Button className="mb-2 shrink-0" variant="outline" onClick={onApply} disabled={!canApply}>
        {applyLabel}
      </Button>

      <Button
        data-testid="secret-delete-bottom"
        className="mt-4 shrink-0"
        variant="destructive"
        onClick={onDelete}
        disabled={!canDelete}
      >
        {deleteLabel}
      </Button>
    </section>
  )
})
