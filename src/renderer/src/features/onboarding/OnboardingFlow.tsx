import { useCallback, useState } from 'react'
import WelcomeStep from './WelcomeStep'

interface OnboardingFlowProps {
  onComplete: () => void
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step] = useState<'welcome'>('welcome')

  const handleModeSelect = useCallback(
    async (_mode: 'retroactive' | 'fresh-start') => {
      await window.brover.onboarding.complete()
      onComplete()
    },
    [onComplete]
  )

  if (step === 'welcome') {
    return <WelcomeStep onSelectMode={handleModeSelect} />
  }

  return null
}
