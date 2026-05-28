import { ArrowLeft } from 'lucide-react'
import { useI18n } from '../../i18n'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import type { OnboardingSummary } from '../../../../shared/models'

interface ConfirmationStepProps {
  summary: OnboardingSummary
  onConfirm: () => void
  onBack: () => void
}

export default function ConfirmationStep({ summary, onConfirm, onBack }: ConfirmationStepProps) {
  const { t } = useI18n()

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-base p-6">
      <div className="flex w-full max-w-lg flex-col gap-8">
        <div className="relative flex items-start gap-1">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center text-text-muted hover:text-text-base transition-colors -ml-1.5 mt-0.5"
            aria-label="back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-text-base text-left">
            {t('onboarding.confirmation.title')}
          </h1>
        </div>

        <div className="flex flex-col gap-3">
          <Card className="flex items-center justify-between p-4">
            <span className="text-sm text-text-muted">
              {t('onboarding.confirmation.toStore')}
            </span>
            <span className="text-xl font-bold text-text-base">
              {summary.importedSensitive}
            </span>
          </Card>

          <Card className="flex items-center justify-between p-4">
            <span className="text-sm text-text-muted">
              {t('onboarding.confirmation.toRemove')}
            </span>
            <span className="text-xl font-bold text-text-base">
              {summary.removedFromDotfiles}
            </span>
          </Card>

          <Card className="flex items-center justify-between p-4">
            <span className="text-sm text-text-muted">
              {t('onboarding.confirmation.ignoredNonSensitive')}
            </span>
            <span className="text-xl font-bold text-text-base">
              {summary.ignoredNonSensitive}
            </span>
          </Card>
        </div>

        {summary.ignoredWithReason.length > 0 && (
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
              {t('onboarding.confirmation.ignoredTitle')}
            </h2>
            <div className="flex flex-col gap-2">
              {summary.ignoredWithReason.map((item, i) => (
                <Card key={i} className="flex flex-col gap-1 p-3">
                  <span className="font-mono text-xs text-text-base">
                    {item.filePath}
                  </span>
                  <span className="text-xs text-text-muted">{item.reason}</span>
                </Card>
              ))}
            </div>
          </div>
        )}

        <Button className="w-full" onClick={onConfirm}>
          {t('onboarding.confirmation.action')}
        </Button>
      </div>
    </div>
  )
}
