import { useCallback, useState } from 'react'
import WelcomeStep from './WelcomeStep'
import RetroactiveReviewStep from './RetroactiveReviewStep'
import FreshStartReviewStep from './FreshStartReviewStep'
import ConfirmationStep from './ConfirmationStep'
import type { ScanResult, OnboardingSummary, RetroactiveSelection } from '../../../../shared/models'

interface OnboardingFlowProps {
  onComplete: () => void
}

function computePreviewSummary(scanResult: ScanResult, selectedIds: string[]): OnboardingSummary {
  const totalVars = scanResult.files.reduce((sum, f) => sum + f.variables.length, 0)
  return {
    importedSensitive: selectedIds.length,
    removedFromDotfiles: selectedIds.length,
    ignoredNonSensitive: totalVars - selectedIds.length,
    ignoredWithReason: [],
  }
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState<'welcome' | 'review' | 'fresh-start-review' | 'confirmation'>('welcome')
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [retroactivePayload, setRetroactivePayload] = useState<{
    scanResult: ScanResult
    selection: RetroactiveSelection
  } | null>(null)

  const handleModeSelect = useCallback(
    (selectedMode: 'retroactive' | 'fresh-start') => {
      if (selectedMode === 'retroactive') {
        setStep('review')
      } else {
        setStep('fresh-start-review')
      }
    },
    []
  )

  const handleFreshStartContinue = useCallback(
    async (payload: { scanResult: ScanResult }) => {
      try {
        await window.brover.onboarding.runFreshStart(payload)
        await window.brover.onboarding.complete()
        onComplete()
      } catch (err) {
        console.error('Fresh start import failed', err)
      }
    },
    [onComplete]
  )

  const handleRetroactiveContinue = useCallback(
    (payload: { scanResult: ScanResult; selection: RetroactiveSelection }) => {
      setRetroactivePayload(payload)
      setScanResult(payload.scanResult)
      setStep('confirmation')
    },
    []
  )

  const handleConfirmRetroactive = useCallback(async () => {
    if (!retroactivePayload) return
    try {
      await window.brover.onboarding.runRetroactive(retroactivePayload)
      await window.brover.onboarding.complete()
      onComplete()
    } catch (err) {
      console.error('Retroactive import failed', err)
    }
  }, [retroactivePayload, onComplete])

  const handleBack = useCallback(() => {
    setStep('welcome')
  }, [])

  const dragStyle = { WebkitAppRegion: 'drag' } as React.CSSProperties

  const summary: OnboardingSummary | null = retroactivePayload
    ? computePreviewSummary(retroactivePayload.scanResult, retroactivePayload.selection.selectedSensitiveIds)
    : null

  const content = (() => {
    if (step === 'welcome') return <WelcomeStep onSelectMode={handleModeSelect} />
    if (step === 'review') return <RetroactiveReviewStep onContinue={handleRetroactiveContinue} onBack={handleBack} />
    if (step === 'fresh-start-review') return <FreshStartReviewStep onContinue={handleFreshStartContinue} onBack={handleBack} />
    if (step === 'confirmation') {
      return (
        <ConfirmationStep
          summary={summary ?? { importedSensitive: 0, removedFromDotfiles: 0, ignoredNonSensitive: 0, ignoredWithReason: [] }}
          onConfirm={handleConfirmRetroactive}
          onBack={handleBack}
        />
      )
    }
    return null
  })()

  return (
    <>
      <div className="absolute inset-x-0 top-0 z-50 h-11 w-20" style={dragStyle} />
      <div className="absolute inset-x-0 top-0 z-50 h-4" style={dragStyle} />
      {content}
    </>
  )
}
