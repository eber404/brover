import { useCallback, useState } from 'react'
import WelcomeStep from './WelcomeStep'
import RetroactiveReviewStep from './RetroactiveReviewStep'
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

  if (step === 'welcome') {
    return <WelcomeStep onSelectMode={handleModeSelect} />
  }

  if (step === 'review') {
    return <RetroactiveReviewStep onContinue={handleRetroactiveContinue} />
  }

  if (step === 'summary') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-base p-6">
        <p className="text-text-base">{JSON.stringify(summaryResult)}</p>
      </div>
    )
  }

  return null
}
