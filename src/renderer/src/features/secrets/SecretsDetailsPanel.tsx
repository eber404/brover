import { memo } from 'react'
import { Trash2 } from 'lucide-react'
import type { EnvMetadata } from '../../../../shared/models'
import { Button } from '../../components/ui/button'
import { SecretsDetail } from './SecretsDetail'

interface SecretsDetailsPanelProps {
  title: string
  env: EnvMetadata | null
  targetName: string
  revealValue: string
  onReveal: () => void
  onCopy: (isRevealed: boolean) => void
  onUpdateValue: (value: string) => void
  onDelete: () => void
  canDelete: boolean
  deleteLabel: string
}

export const SecretsDetailsPanel = memo(function SecretsDetailsPanel(
  props: SecretsDetailsPanelProps
) {
  const {
    title,
    env,
    targetName,
    revealValue,
    onReveal,
    onCopy,
    onUpdateValue,
    onDelete,
    canDelete,
    deleteLabel,
  } = props

  return (
    <section className="flex h-full flex-col bg-panel/80 pt-4">
      <div className="flex-1 overflow-y-auto">
        <div className="px-4">
          <SecretsDetail
            env={env}
            targetName={targetName}
            revealValue={revealValue}
            onReveal={onReveal}
            onCopy={onCopy}
            onUpdateValue={onUpdateValue}
          />
        </div>
      </div>

      {canDelete ? (
        <div className="px-4 pb-4">
          <Button
            data-testid="secret-delete-bottom"
            className="mt-4 w-full shrink-0"
            variant="destructive"
            onClick={onDelete}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {deleteLabel}
          </Button>
        </div>
      ) : null}
    </section>
  )
})
