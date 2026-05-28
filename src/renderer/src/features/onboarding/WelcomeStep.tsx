import { useCallback } from 'react'
import { useI18n } from '../../i18n'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'

interface WelcomeStepProps {
  onSelectMode: (mode: 'retroactive' | 'fresh-start') => void
}

export default function WelcomeStep({ onSelectMode }: WelcomeStepProps) {
  const { t } = useI18n()

  const handleRetroactive = useCallback(() => {
    onSelectMode('retroactive')
  }, [onSelectMode])

  const handleFreshStart = useCallback(() => {
    onSelectMode('fresh-start')
  }, [onSelectMode])

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-base p-6">
      <div className="flex w-full max-w-2xl flex-col items-center gap-10">
        <div className="flex flex-col items-center gap-3 text-center animate-fade-in">
          <h1 className="text-3xl font-bold tracking-tight text-text-base">
            {t('onboarding.welcome.title')}
          </h1>
          <p className="max-w-md text-text-muted">
            {t('onboarding.welcome.subtitle')}
          </p>
        </div>

        <div className="grid w-full grid-cols-2 gap-4">
          <Card className="flex cursor-pointer flex-col gap-3 p-6 transition hover:border-accent hover:shadow-lg animate-fade-in-up">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold text-text-base">
                {t('onboarding.mode.retroactive.title')}
              </h2>
              <p className="text-sm text-text-muted">
                {t('onboarding.mode.retroactive.desc')}
              </p>
            </div>
            <Button
              variant="outline"
              className="mt-auto w-full"
              onClick={handleRetroactive}
            >
              {t('onboarding.mode.retroactive.action')}
            </Button>
          </Card>

          <Card className="flex cursor-pointer flex-col gap-3 p-6 transition hover:border-accent hover:shadow-lg animate-fade-in-up">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold text-text-base">
                {t('onboarding.mode.freshStart.title')}
              </h2>
              <p className="text-sm text-text-muted">
                {t('onboarding.mode.freshStart.desc')}
              </p>
            </div>
            <Button
              variant="outline"
              className="mt-auto w-full"
              onClick={handleFreshStart}
            >
              {t('onboarding.mode.freshStart.action')}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
