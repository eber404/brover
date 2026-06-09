import { useCallback, useEffect, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowUp } from 'lucide-react'
import { useI18n } from '../../i18n'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import type { TerminalApp } from '../../../../shared/models'
import type { LaunchPreferences } from '../launch/preferences'

interface TerminalPreferencesStepProps {
  onBack: () => void
  onContinue: (preferences: LaunchPreferences) => void
}

function moveItem(ids: string[], fromIndex: number, toIndex: number) {
  const next = [...ids]
  const [moved] = next.splice(fromIndex, 1)
  if (!moved) return ids
  next.splice(toIndex, 0, moved)
  return next
}

export default function TerminalPreferencesStep({
  onBack,
  onContinue,
}: TerminalPreferencesStepProps) {
  const { t } = useI18n()
  const [terminals, setTerminals] = useState<TerminalApp[]>([])
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])
  const [draggingTerminalId, setDraggingTerminalId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const orderedTerminals = [
    ...favoriteIds
      .map((favoriteId) => terminals.find((terminal) => terminal.id === favoriteId))
      .filter((terminal): terminal is TerminalApp => Boolean(terminal)),
    ...terminals.filter((terminal) => !favoriteIds.includes(terminal.id)),
  ]

  useEffect(() => {
    window.brover.launch
      .listTerminals()
      .then(({ terminals }) => {
        setTerminals(terminals.filter((terminal) => terminal.installed))
        setLoading(false)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : String(err))
        setLoading(false)
      })
  }, [])

  const toggleFavorite = useCallback((terminalId: string) => {
    setFavoriteIds((prev) => {
      if (prev.includes(terminalId)) {
        return prev.filter((id) => id !== terminalId)
      }
      return [...prev, terminalId]
    })
  }, [])

  const moveFavorite = useCallback((terminalId: string, direction: 'up' | 'down') => {
    setFavoriteIds((prev) => {
      const index = prev.indexOf(terminalId)
      if (index < 0) return prev
      if (direction === 'up' && index === 0) return prev
      if (direction === 'up') return moveItem(prev, index, index - 1)
      if (index === prev.length - 1) return prev
      return moveItem(prev, index, index + 1)
    })
  }, [])

  const reorderFavorite = useCallback((sourceId: string, targetId: string) => {
    if (sourceId === targetId) return
    setFavoriteIds((prev) => {
      const fromIndex = prev.indexOf(sourceId)
      const toIndex = prev.indexOf(targetId)
      if (fromIndex < 0 || toIndex < 0) return prev
      return moveItem(prev, fromIndex, toIndex)
    })
  }, [])

  const handleContinue = useCallback(() => {
    const defaultTerminalId = favoriteIds[0]
    if (!defaultTerminalId) return
    onContinue({
      favoriteTerminalIds: favoriteIds,
      defaultTerminalId,
    })
  }, [favoriteIds, onContinue])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-base">
        <p className="text-text-muted">{t('onboarding.terminalPreferences.loading')}</p>
      </div>
    )
  }

  if (error || terminals.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-base">
        <Card className="flex flex-col items-center gap-4 p-8">
          <p className="text-rose-status">
            {error ?? t('onboarding.terminalPreferences.error')}
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
              className="-ml-1.5 mt-0.5 flex cursor-pointer items-center text-text-muted transition-colors hover:text-text-base"
              aria-label="back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold text-text-base text-left">
              {t('onboarding.terminalPreferences.title')}
            </h1>
            <p className="text-sm text-text-muted">
              {t('onboarding.terminalPreferences.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {orderedTerminals.map((terminal) => {
            const favoriteIndex = favoriteIds.indexOf(terminal.id)
            const isFavorite = favoriteIndex >= 0
            const favoriteCardClassName = `flex items-center gap-3 px-4 py-3 transition-colors ${isFavorite ? 'border-blue-500 ring-1 ring-blue-500' : 'hover:border-edge/40'} ${draggingTerminalId === terminal.id ? 'opacity-50' : ''}`

            return (
              <Card
                key={terminal.id}
                data-testid={`favorite-terminal-${terminal.id}`}
                className={favoriteCardClassName}
                onClick={() => toggleFavorite(terminal.id)}
                draggable={isFavorite}
                onDragStart={(event) => {
                  if (!isFavorite) return
                  setDraggingTerminalId(terminal.id)
                  event.dataTransfer.effectAllowed = 'move'
                  event.dataTransfer.setData('text/plain', terminal.id)
                }}
                onDragEnd={() => setDraggingTerminalId(null)}
                onDragOver={(event) => {
                  if (!isFavorite) return
                  event.preventDefault()
                  event.dataTransfer.dropEffect = 'move'
                }}
                onDrop={(event) => {
                  if (!isFavorite) return
                  event.preventDefault()
                  const sourceId = event.dataTransfer.getData('text/plain') || draggingTerminalId
                  if (!sourceId) return
                  reorderFavorite(sourceId, terminal.id)
                  setDraggingTerminalId(null)
                }}
              >
                <div className="flex flex-1 items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isFavorite}
                    onChange={() => toggleFavorite(terminal.id)}
                    onClick={(event) => event.stopPropagation()}
                    aria-label={terminal.name}
                  />
                  <div className="flex flex-1 flex-col gap-0.5">
                    <span className="font-medium text-sm text-text-base">{terminal.name}</span>
                    <span className="text-xs text-text-muted">{terminal.bundlePath}</span>
                  </div>
                </div>

                {isFavorite && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="cursor-pointer rounded p-1 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-base disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={(event) => {
                        event.stopPropagation()
                        moveFavorite(terminal.id, 'up')
                      }}
                      disabled={favoriteIndex === 0}
                      aria-label={`move ${terminal.name} up`}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="cursor-pointer rounded p-1 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-base disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={(event) => {
                        event.stopPropagation()
                        moveFavorite(terminal.id, 'down')
                      }}
                      disabled={favoriteIndex === favoriteIds.length - 1}
                      aria-label={`move ${terminal.name} down`}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </Card>
            )
          })}
        </div>

        <Button className="w-full" onClick={handleContinue} disabled={favoriteIds.length === 0}>
          {t('onboarding.terminalPreferences.continue')}
        </Button>
      </div>
    </div>
  )
}
