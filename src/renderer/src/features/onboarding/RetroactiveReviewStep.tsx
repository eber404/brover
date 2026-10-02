import { useCallback, useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { useI18n } from '../../i18n'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import type {
  RetroactiveSelection,
  ScanResult,
  ScannedVariable,
} from '../../../../shared/models'

interface RetroactiveReviewStepProps {
  onContinue: (payload: {
    scanResult: ScanResult
    selection: RetroactiveSelection
  }) => void
  onBack: () => void
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

export default function RetroactiveReviewStep({
  onContinue,
  onBack,
}: RetroactiveReviewStepProps) {
  const { t } = useI18n()
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set())
  const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(new Set())

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
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleReveal = useCallback((id: string) => {
    setRevealedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleCollapse = useCallback((filePath: string) => {
    setCollapsedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(filePath)) next.delete(filePath)
      else next.add(filePath)
      return next
    })
  }, [])

  const handleContinue = useCallback(() => {
    if (!scanResult) return
    onContinue({
      scanResult,
      selection: { selectedSensitiveIds: Array.from(selectedIds) },
    })
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
          <p className="text-rose-status">
            {error ?? t('onboarding.review.error')}
          </p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            {t('common.refresh')}
          </Button>
        </Card>
      </div>
    )
  }

  const groups = groupByFile(scanResult)

  return (
    <div className="flex min-h-screen bg-surface-base px-6 pb-6 pt-16">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="flex items-start gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="mt-1.5 flex shrink-0 cursor-pointer items-center text-text-muted transition-colors hover:text-text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label="back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-2xl font-bold leading-tight text-text-base text-left">
              {t('onboarding.review.title')}
            </h1>
            <p className="text-sm leading-relaxed text-text-muted">
              {t('onboarding.review.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {groups.map((group) => {
            const isCollapsed = collapsedPaths.has(group.filePath)
            return (
              <div key={group.filePath}>
                <button
                  type="button"
                  onClick={() => toggleCollapse(group.filePath)}
                  className="flex w-full cursor-pointer items-center justify-between py-1 text-sm font-semibold uppercase tracking-wide text-text-muted transition-colors hover:text-text-base"
                >
                  <span>{fileName(group.filePath)}</span>
                  {isCollapsed && <ChevronRight className="h-4 w-4" />}
                  {!isCollapsed && <ChevronDown className="h-4 w-4" />}
                </button>
                {!isCollapsed && (
                  <div className="mt-2 flex flex-col gap-1.5">
                    {group.variables.map((v) => {
                      const isSelected = selectedIds.has(v.id)
                      const isRevealed = revealedIds.has(v.id)
                      const cardClassName = `flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors ${isSelected ? 'border-blue-500 ring-1 ring-blue-500' : 'hover:border-edge/40'}`
                      const valueLabel = isRevealed ? v.value : '••••••'
                      const revealLabel = isRevealed ? t('onboarding.review.hide') : t('onboarding.review.reveal')

                      return (
                        <Card
                          key={v.id}
                          className={cardClassName}
                          onClick={() => toggleSelection(v.id)}
                        >
                          <div className="flex flex-1 flex-col gap-0.5">
                            <span className="font-mono text-sm text-text-base">
                              {v.name}
                            </span>
                            <span className="text-xs text-text-muted">{valueLabel}</span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleReveal(v.id)
                            }}
                            className="cursor-pointer text-text-muted transition-colors hover:text-accent"
                            aria-label={revealLabel}
                          >
                            {isRevealed && <EyeOff className="h-5 w-5" />}
                            {!isRevealed && <Eye className="h-5 w-5" />}
                          </button>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {groups.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-text-muted">
              {t('onboarding.review.noVariables')}
            </p>
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
