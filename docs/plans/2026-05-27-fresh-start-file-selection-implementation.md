# Fresh Start Dotfile Selection Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a dotfile selection step to fresh-start onboarding so users pick which files to import as spaces.

**Architecture:** New `FreshStartReviewStep` component in renderer, step added to `OnboardingFlow`. Renderer filters `scanResult.files` before passing to existing `runFreshStartImport` IPC. Zero backend changes.

**Tech Stack:** React, TypeScript, TailwindCSS, i18n

---

### Task 1: Add i18n keys

**Files:**
- Modify: `src/renderer/src/i18n/locales/en.json`
- Modify: `src/renderer/src/i18n/locales/es.json`
- Modify: `src/renderer/src/i18n/locales/pt.json`

**Step 1: Add keys to en.json**

Add after `onboarding.confirmation.action` closing brace:

```json
    "freshStartReview": {
      "title": "Fresh Start — Select dotfiles",
      "subtitle": "Choose which files to scan for creating spaces.",
      "loading": "Scanning dotfiles...",
      "error": "Failed to scan dotfiles",
      "noFiles": "No dotfiles found",
      "continue": "Continue"
    }
```

**Step 2: Add same keys to es.json**

```json
    "freshStartReview": {
      "title": "Nuevo inicio — Seleccionar archivos",
      "subtitle": "Elija qué archivos escanear para crear espacios.",
      "loading": "Escaneando dotfiles...",
      "error": "Error al escanear dotfiles",
      "noFiles": "No se encontraron dotfiles",
      "continue": "Continuar"
    }
```

**Step 3: Add same keys to pt.json**

```json
    "freshStartReview": {
      "title": "Novo início — Selecionar arquivos",
      "subtitle": "Escolha quais arquivos escanear para criar espaços.",
      "loading": "Escaneando dotfiles...",
      "error": "Falha ao escanear dotfiles",
      "noFiles": "Nenhum dotfile encontrado",
      "continue": "Continuar"
    }
```

**Step 4: Run tests to verify no regressions**

Run: `npx vitest run`
Expected: All tests pass

**Step 5: Commit**

```bash
git add src/renderer/src/i18n/locales/en.json src/renderer/src/i18n/locales/es.json src/renderer/src/i18n/locales/pt.json
git commit -m "i18n: fresh-start review step keys"
```

---

### Task 2: Create FreshStartReviewStep component

**Files:**
- Create: `src/renderer/src/features/onboarding/FreshStartReviewStep.tsx`
- Test: `src/renderer/src/features/onboarding/OnboardingFlow.test.tsx` (update later)

**Step 1: Create the component**

Path: `src/renderer/src/features/onboarding/FreshStartReviewStep.tsx`

```tsx
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
                    {file.filePath} · {file.variables.length} vars
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
```

**Step 2: Run tests to verify no regressions**

Run: `npx vitest run`
Expected: All pass (new component not wired yet)

**Step 3: Commit**

```bash
git add src/renderer/src/features/onboarding/FreshStartReviewStep.tsx
git commit -m "feat: create FreshStartReviewStep component"
```

---

### Task 3: Wire FreshStartReviewStep into OnboardingFlow

**Files:**
- Modify: `src/renderer/src/features/onboarding/OnboardingFlow.tsx`

**Step 1: Update OnboardingFlow**

Add import for `FreshStartReviewStep`. Add `'fresh-start-review'` to step union type.

Change `handleModeSelect`:
- `'fresh-start'` → `setStep('fresh-start-review')` (remove scan + import call)

Add `handleFreshStartContinue`:
```tsx
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
```

Add step rendering:
```tsx
if (step === 'fresh-start-review') {
  return <FreshStartReviewStep onContinue={handleFreshStartContinue} onBack={handleBack} />
}
```

**Step 2: Run tests**

Run: `npx vitest run`
Expected: All pass (including OnboardingFlow tests)

**Step 3: Commit**

```bash
git add src/renderer/src/features/onboarding/OnboardingFlow.tsx
git commit -m "feat: wire FreshStartReviewStep into onboarding flow"
```

---

### Task 4: Update OnboardingFlow tests

**Files:**
- Modify: `src/renderer/src/features/onboarding/OnboardingFlow.test.tsx`

**Step 1: Read existing tests to understand patterns**

Read: `src/renderer/src/features/onboarding/OnboardingFlow.test.tsx`

The existing fresh-start test (`fresh start completes onboarding directly without confirmation`) needs to be updated since the flow now shows a review step instead of completing immediately.

**Step 2: Update the fresh start test**

Replace the test that expects immediate completion. The new test should:
- Click "Start fresh"
- Wait for scan to resolve
- Verify the FreshStartReviewStep title is shown
- Select a file
- Click Continue
- Verify `runFreshStart` and `complete` were called

Mock `scanDotfiles` to return a result with one file containing one variable.

**Step 3: Run tests**

Run: `npx vitest run`
Expected: All pass

**Step 4: Commit**

```bash
git add src/renderer/src/features/onboarding/OnboardingFlow.test.tsx
git commit -m "test: update fresh-start onboarding test for file selection"
```

---

### Task 5: Final verification

**Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All 151+ tests pass

**Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Push**

```bash
git push
```
