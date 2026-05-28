import { useCallback, useState } from 'react'
import WelcomeStep from './WelcomeStep'
import RetroactiveReviewStep from './RetroactiveReviewStep'
import SummaryStep from './SummaryStep'
import type { ScanResult, OnboardingSummary, RetroactiveSelection } from '../../../../shared/models'

interface OnboardingFlowProps {
  onComplete: () => void
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState<'welcome' | 'review' | 'summary'>('welcome')
  const [mode, setMode] = useState<'retroactive' | 'fresh-start' | null>(null)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [summaryResult, setSummaryResult] = useState<OnboardingSummary | null>(null)

  const handleModeSelect = useCallback(
    async (selectedMode: 'retroactive' | 'fresh-start') => {
      setMode(selectedMode)
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

  if (step === 'welcome') {
    return <WelcomeStep onSelectMode={handleModeSelect} />
  }

  if (step === 'review') {
    return <RetroactiveReviewStep onContinue={handleRetroactiveContinue} />
  }

  if (step === 'summary') {
    return (
      <SummaryStep
        summary={summaryResult ?? { importedSensitive: 0, removedFromDotfiles: 0, ignoredNonSensitive: 0, ignoredWithReason: [] }}
        onComplete={handleComplete}
      />
    )
  }

  return null
}
