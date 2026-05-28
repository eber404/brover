import { useCallback, useEffect, useState } from 'react'
import { useI18n } from '../../i18n'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import type { RetroactiveSelection, ScanResult, ScannedVariable } from '../../../../shared/models'

interface RetroactiveReviewStepProps {
  onContinue: (payload: { scanResult: ScanResult; selection: RetroactiveSelection }) => void
}

interface FileGroup {
  filePath: string
  variables: ScannedVariable[]
}

function groupByFile(scanResult: ScanResult): FileGroup[] {
  return scanResult.files.map((f) => ({
    filePath: f.filePath,
    variables: f.variables,
  }))
}

function fileName(filePath: string): string {
  return filePath.split('/').pop() ?? filePath
}

export default function RetroactiveReviewStep({ onContinue }: RetroactiveReviewStepProps) {
  const { t } = useI18n()
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set())

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

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const toggleReveal = useCallback((id: string) => {
    setRevealedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleContinue = useCallback(() => {
    if (!scanResult) return
    onContinue({ scanResult, selection: { selectedSensitiveIds: Array.from(selectedIds) } })
  }, [onContinue, scanResult, selectedIds])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-base">
        <p className="text-text-muted">{t('onboarding.review.loading')}</p>
      </div>
    )
  }

  if (error || !scanResult) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-base">
        <Card className="flex flex-col items-center gap-4 p-8">
          <p className="text-rose-status">{error ?? t('onboarding.review.error')}</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            {t('common.refresh')}
          </Button>
        </Card>
      </div>
    )
  }

  const groups = groupByFile(scanResult)

  return (
    <div className="flex min-h-screen bg-surface-base p-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-text-base">{t('onboarding.review.title')}</h1>
          <p className="text-sm text-text-muted">{t('onboarding.review.subtitle')}</p>
        </div>

        {scanResult.warnings.length > 0 && (
          <Card className="border-amber-action bg-amber-on p-4">
            <p className="text-sm text-amber-status">{t('onboarding.review.warnings')}</p>
            <ul className="mt-2 list-inside list-disc text-sm text-text-muted">
              {scanResult.warnings.map((w, i) => (
                <li key={i}>{w.message}</li>
              ))}
            </ul>
          </Card>
        )}

        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <div key={group.filePath}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-text-muted">
                {fileName(group.filePath)}
              </h2>
              <div className="flex flex-col gap-2">
                {group.variables.map((v) => (
                  <Card key={v.id} className="flex items-center gap-3 p-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(v.id)}
                      onChange={() => toggleSelection(v.id)}
                      className="h-4 w-4 cursor-pointer accent-accent"
                      aria-label={`${t('onboarding.review.selectVariable')} ${v.name}`}
                    />
                    <div className="flex flex-1 flex-col gap-0.5">
                      <span className="font-mono text-sm text-text-base">{v.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-text-muted">
                          {revealedIds.has(v.id) ? v.value : '••••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleReveal(v.id)}
                          className="text-xs text-accent hover:underline"
                          aria-label={
                            revealedIds.has(v.id)
                              ? t('onboarding.review.hide')
                              : t('onboarding.review.reveal')
                          }
                        >
                          {revealedIds.has(v.id)
                            ? t('onboarding.review.hide')
                            : t('onboarding.review.reveal')}
                        </button>
                      </div>
                    </div>
                    <span className="text-[10px] text-text-muted">
                      {fileName(v.sourceFile)}
                    </span>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>

        {groups.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-text-muted">{t('onboarding.review.noVariables')}</p>
          </Card>
        )}

        <Button
          className="w-full"
          onClick={handleContinue}
          disabled={selectedIds.size === 0}
        >
          {t('onboarding.review.continue')}
        </Button>
      </div>
    </div>
  )
}
