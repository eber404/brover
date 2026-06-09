import { useCallback, useState } from 'react'
import WelcomeStep from './WelcomeStep'
import RetroactiveReviewStep from './RetroactiveReviewStep'
import ConfirmationStep from './ConfirmationStep'
import TerminalPreferencesStep from './TerminalPreferencesStep'
import type { ScanResult, OnboardingSummary, RetroactiveSelection } from '../../../../shared/models'
import type { LaunchPreferences } from '../launch/preferences'
import { saveLaunchPreferences } from '../launch/preferences'
import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/button'

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
  const [step, setStep] = useState<'welcome' | 'review' | 'fresh-start-loading' | 'confirmation' | 'terminal-preferences'>('welcome')
  const [retroactivePayload, setRetroactivePayload] = useState<{
    scanResult: ScanResult
    selection: RetroactiveSelection
  } | null>(null)
  const [freshStartPayload, setFreshStartPayload] = useState<{ scanResult: ScanResult } | null>(null)
  const [terminalPreferencesOrigin, setTerminalPreferencesOrigin] = useState<
    'fresh-start' | 'retroactive' | null
  >(null)
  const [freshStartError, setFreshStartError] = useState<string | null>(null)

  const startFreshStart = useCallback(async () => {
    setFreshStartError(null)
    setStep('fresh-start-loading')

    try {
      const nextScanResult = await window.brover.onboarding.scanDotfiles()
      setFreshStartPayload({ scanResult: nextScanResult })
      setTerminalPreferencesOrigin('fresh-start')
      setStep('terminal-preferences')
    } catch (err) {
      setFreshStartError(err instanceof Error ? err.message : String(err))
    }
  }, [])

  const handleModeSelect = useCallback(
    (selectedMode: 'retroactive' | 'fresh-start') => {
      setFreshStartPayload(null)
      setRetroactivePayload(null)
      setTerminalPreferencesOrigin(null)
      setFreshStartError(null)
      if (selectedMode === 'retroactive') {
        setStep('review')
        return
      }

      void startFreshStart()
    },
    [startFreshStart]
  )

  const handleRetroactiveContinue = useCallback(
    (payload: { scanResult: ScanResult; selection: RetroactiveSelection }) => {
      setRetroactivePayload(payload)
      setStep('confirmation')
    },
    []
  )

  const handleConfirmRetroactive = useCallback(async () => {
    if (!retroactivePayload) return
    setTerminalPreferencesOrigin('retroactive')
    setStep('terminal-preferences')
  }, [retroactivePayload])

  const handleTerminalPreferencesContinue = useCallback(
    async (preferences: LaunchPreferences) => {
      try {
        saveLaunchPreferences(preferences)
        if (freshStartPayload) {
          await window.brover.onboarding.runFreshStart(freshStartPayload)
        } else if (retroactivePayload) {
          await window.brover.onboarding.runRetroactive(retroactivePayload)
        }
        await window.brover.onboarding.complete()
        onComplete()
      } catch (err) {
        console.error('Onboarding terminal preferences failed', err)
      }
    },
    [freshStartPayload, onComplete, retroactivePayload]
  )

  const handleTerminalPreferencesBack = useCallback(() => {
    if (terminalPreferencesOrigin === 'fresh-start') {
      setFreshStartPayload(null)
      setTerminalPreferencesOrigin(null)
      setStep('welcome')
      return
    }
    setStep('confirmation')
  }, [terminalPreferencesOrigin])

  const handleBack = useCallback(() => {
    setFreshStartPayload(null)
    setRetroactivePayload(null)
    setTerminalPreferencesOrigin(null)
    setStep('welcome')
  }, [])

  const dragStyle = { WebkitAppRegion: 'drag' } as React.CSSProperties

  const summary: OnboardingSummary | null = retroactivePayload
    ? computePreviewSummary(retroactivePayload.scanResult, retroactivePayload.selection.selectedSensitiveIds)
    : null

  const freshStartLoadingContent = freshStartError ? (
    <div className="flex min-h-screen items-center justify-center bg-surface-base p-6">
      <Card className="flex w-full max-w-md flex-col items-center gap-4 p-8 text-center">
        <p className="text-rose-status">{freshStartError}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleBack}>
            Back
          </Button>
          <Button onClick={() => void startFreshStart()}>Retry</Button>
        </div>
      </Card>
    </div>
  ) : (
    <div className="flex min-h-screen items-center justify-center bg-surface-base">
      <p className="text-text-muted">Preparing fresh start...</p>
    </div>
  )

  const content = (() => {
    if (step === 'welcome') return <WelcomeStep onSelectMode={handleModeSelect} />
    if (step === 'review') return <RetroactiveReviewStep onContinue={handleRetroactiveContinue} onBack={handleBack} />
    if (step === 'fresh-start-loading') return freshStartLoadingContent
    if (step === 'confirmation') {
      return (
        <ConfirmationStep
          summary={summary ?? { importedSensitive: 0, removedFromDotfiles: 0, ignoredNonSensitive: 0, ignoredWithReason: [] }}
          onConfirm={handleConfirmRetroactive}
          onBack={handleBack}
        />
      )
    }
    if (step === 'terminal-preferences') {
      return (
        <TerminalPreferencesStep
          onBack={handleTerminalPreferencesBack}
          onContinue={handleTerminalPreferencesContinue}
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
