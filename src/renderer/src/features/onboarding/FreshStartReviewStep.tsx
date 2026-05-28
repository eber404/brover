import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useI18n } from '../../i18n'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import type { ScanResult } from '../../../../shared/models'

interface FreshStartReviewStepProps {
  onContinue: (payload: { scanResult: ScanResult }) => void
  onBack: () => void
}

function fileName(filePath: string): string {
  return filePath.split('/').pop() ?? filePath
}

export default function FreshStartReviewStep({
  onContinue,
  onBack,
}: FreshStartReviewStepProps) {
  const { t } = useI18n()
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set())

  useEffect(() => {
    window.brover.onboarding
      .scanDotfiles()
      .then((result) => {
        setScanResult(result)
        setLoading(false)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : String(err))
        setLoading(false)
      })
  }, [])

  const toggleSelection = useCallback((filePath: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(filePath)) next.delete(filePath)
      else next.add(filePath)
      return next
    })
  }, [])

  const handleContinue = useCallback(() => {
    if (!scanResult) return
    const filtered: ScanResult = {
      ...scanResult,
      files: scanResult.files.filter((f) => selectedPaths.has(f.filePath)),
    }
    onContinue({ scanResult: filtered })
  }, [onContinue, scanResult, selectedPaths])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-base">
        <p className="text-text-muted">{t('onboarding.freshStartReview.loading')}</p>
      </div>
    )
  }

  if (error || !scanResult) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-base">
        <Card className="flex flex-col items-center gap-4 p-8">
          <p className="text-rose-status">
            {error ?? t('onboarding.freshStartReview.error')}
          </p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            {t('common.refresh')}
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-surface-base p-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="relative flex items-start gap-1">
          <div className="absolute -left-8 top-1">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center text-text-muted hover:text-text-base transition-colors -ml-1.5 mt-0.5"
              aria-label="back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold text-text-base text-left">
              {t('onboarding.freshStartReview.title')}
            </h1>
            <p className="text-sm text-text-muted">
              {t('onboarding.freshStartReview.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {scanResult.files.map((file) => {
            const isSelected = selectedPaths.has(file.filePath)
            return (
              <Card
                key={file.filePath}
                className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors ${
                  isSelected
                    ? 'border-blue-500 ring-1 ring-blue-500'
                    : 'hover:border-edge/40'
                }`}
                onClick={() => toggleSelection(file.filePath)}
              >
                <div className="flex flex-1 flex-col gap-0.5">
                  <span className="font-medium text-sm text-text-base">
                    {fileName(file.filePath)}
                  </span>
                  <span className="text-xs text-text-muted">
                    {file.filePath}
                  </span>
                </div>
              </Card>
            )
          })}
        </div>

        {scanResult.files.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-text-muted">
              {t('onboarding.freshStartReview.noFiles')}
            </p>
          </Card>
        )}

        <Button
          className="w-full"
          onClick={handleContinue}
          disabled={selectedPaths.size === 0}
        >
          {t('onboarding.freshStartReview.continue')}
        </Button>
      </div>
    </div>
  )
}
