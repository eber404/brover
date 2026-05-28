import { useCallback, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import WelcomeStep from './WelcomeStep'
import RetroactiveReviewStep from './RetroactiveReviewStep'
import SummaryStep from './SummaryStep'
import type { ScanResult, OnboardingSummary, RetroactiveSelection } from '../../../../shared/models'

interface OnboardingFlowProps {
  onComplete: () => void
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState<'welcome' | 'review' | 'summary'>('welcome')
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [summaryResult, setSummaryResult] = useState<OnboardingSummary | null>(null)

  const handleModeSelect = useCallback(
    async (selectedMode: 'retroactive' | 'fresh-start') => {
      if (selectedMode === 'retroactive') {
        setStep('review')
      } else {
        const scan = await window.brover.onboarding.scanDotfiles()
        setScanResult(scan)
        const summary = await window.brover.onboarding.runFreshStart({ scanResult: scan })
        setSummaryResult(summary)
        setStep('summary')
      }
    },
    []
  )

  const handleRetroactiveContinue = useCallback(
    async (payload: { scanResult: ScanResult; selection: RetroactiveSelection }) => {
      setScanResult(payload.scanResult)
      const summary = await window.brover.onboarding.runRetroactive(payload)
      setSummaryResult(summary)
      setStep('summary')
    },
    []
  )

  const handleComplete = useCallback(async () => {
    await window.brover.onboarding.complete()
    onComplete()
  }, [onComplete])

  const handleBack = useCallback(() => {
    setStep('welcome')
  }, [])

  const dragStyle = { WebkitAppRegion: 'drag' } as React.CSSProperties

  const content = (() => {
    if (step === 'welcome') return <WelcomeStep onSelectMode={handleModeSelect} />
    if (step === 'review') return <RetroactiveReviewStep onContinue={handleRetroactiveContinue} />
    if (step === 'summary') {
      return (
        <SummaryStep
          summary={summaryResult ?? { importedSensitive: 0, removedFromDotfiles: 0, ignoredNonSensitive: 0, ignoredWithReason: [] }}
          onComplete={handleComplete}
        />
      )
    }
    return null
  })()

  return (
    <>
      <div className="absolute inset-x-0 top-0 z-50 h-11 w-20" style={dragStyle} />
      <div className="absolute inset-x-0 top-0 z-50 h-4" style={dragStyle} />
      {step !== 'welcome' && (
        <button
          type="button"
          onClick={handleBack}
          className="absolute left-4 top-4 z-50 flex items-center gap-1 text-sm text-text-muted hover:text-text-base transition-colors"
          aria-label="back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
      )}
      {content}
    </>
  )
}
