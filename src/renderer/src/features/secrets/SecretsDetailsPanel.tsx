import { memo } from 'react'
import { Trash2 } from 'lucide-react'
import type { EnvMetadata } from '../../../../shared/models'
import { Button } from '../../components/ui/button'
import { SecretsDetail } from './SecretsDetail'

interface SecretsDetailsPanelProps {
  title: string
  env: EnvMetadata | null
  environmentName: string
  revealValue: string
  hasValue: boolean
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
    environmentName,
    revealValue,
    hasValue,
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
            environmentName={environmentName}
            revealValue={revealValue}
            hasValue={hasValue}
            onCopy={onCopy}
            onUpdateValue={onUpdateValue}
            onDelete={onDelete}
            canDelete={canDelete}
          />
        </div>
      </div>
    </section>
  )
})