import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import type { TerminalApp } from '../../../../shared/models'
import {
  getLaunchPreferences,
  promoteLaunchDefault,
  saveLaunchPreferences,
  type LaunchPreferences,
} from '../launch/preferences'
import { useI18n } from '../../i18n'
import { useToast } from '../../components/ui/toaster'

interface TerminalSidebarProps {
  locale: 'en' | 'es' | 'pt'
  onLocaleChange: (locale: 'en' | 'es' | 'pt') => void
  selectedEnvironmentId: string | null
}

export const TerminalSidebar = memo(function TerminalSidebar(
  props: TerminalSidebarProps
) {
  const { locale, onLocaleChange, selectedEnvironmentId } = props
  const { t } = useI18n()
  const { toast } = useToast()
  const asideRef = useRef<HTMLElement | null>(null)
  const [terminals, setTerminals] = useState<TerminalApp[]>([])
  const [launchPreferences, setLaunchPreferences] = useState<LaunchPreferences>(
    () => getLaunchPreferences([])
  )
  const [contextMenu, setContextMenu] = useState<{
    terminalId: string
    x: number
    y: number
  } | null>(null)
  const [draggingTerminalId, setDraggingTerminalId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    window.brover.launch
      .listTerminals()
      .then(({ terminals: nextTerminals }) => {
        if (cancelled) return
        const installedTerminals = nextTerminals.filter(
          (terminal) => terminal.installed
        )
        setTerminals(installedTerminals)
        setLaunchPreferences(
          getLaunchPreferences(
            installedTerminals.map((terminal) => terminal.id)
          )
        )
      })
      .catch(() => {
        if (cancelled) return
        setTerminals([])
      })

    return () => {
      cancelled = true
    }
  }, [])

  const orderedTerminals = useMemo(() => {
    if (terminals.length === 0) return []
    const rank = new Map(
      launchPreferences.favoriteTerminalIds.map((id, index) => [id, index])
    )
    return terminals
      .filter((terminal) =>
        launchPreferences.favoriteTerminalIds.includes(terminal.id)
      )
      .sort((a, b) => {
        const aRank = rank.get(a.id)
        const bRank = rank.get(b.id)
        if (aRank == null && bRank == null) return a.name.localeCompare(b.name)
        if (aRank == null) return 1
        if (bRank == null) return -1
        return aRank - bRank
      })
  }, [launchPreferences.favoriteTerminalIds, terminals])

  async function launchTerminal(terminalId: string) {
    if (!selectedEnvironmentId) return
    const nextPreferences = promoteLaunchDefault(launchPreferences, terminalId)
    setLaunchPreferences(nextPreferences)
    saveLaunchPreferences(nextPreferences)
    await window.brover.launch.terminal(selectedEnvironmentId, terminalId)
  }

  function addFavoriteTerminal(terminalId: string) {
    if (launchPreferences.favoriteTerminalIds.includes(terminalId)) {
      return
    }

    const nextPreferences = {
      favoriteTerminalIds: [
        ...launchPreferences.favoriteTerminalIds,
        terminalId,
      ],
      defaultTerminalId:
        launchPreferences.favoriteTerminalIds.length === 0
          ? terminalId
          : launchPreferences.defaultTerminalId,
    }
    setLaunchPreferences(nextPreferences)
    saveLaunchPreferences(nextPreferences)
  }

  function removeFavoriteTerminal(terminalId: string) {
    if (!launchPreferences.favoriteTerminalIds.includes(terminalId)) {
      return
    }

    const favoriteTerminalIds = launchPreferences.favoriteTerminalIds.filter(
      (id) => id !== terminalId
    )
    const defaultTerminalId =
      launchPreferences.defaultTerminalId === terminalId
        ? (favoriteTerminalIds[0] ?? '')
        : launchPreferences.defaultTerminalId

    const nextPreferences = {
      favoriteTerminalIds,
      defaultTerminalId,
    }

    setLaunchPreferences(nextPreferences)
    saveLaunchPreferences(nextPreferences)
    setContextMenu(null)
  }

  function handleDrop(targetId: string, event: React.DragEvent) {
    event.preventDefault()
    const sourceId =
      event.dataTransfer.getData('text/plain') || draggingTerminalId
    setDraggingTerminalId(null)
    if (!sourceId || sourceId === targetId) return

    const ids = [...launchPreferences.favoriteTerminalIds]
    const sourceIndex = ids.indexOf(sourceId)
    const targetIndex = ids.indexOf(targetId)
    if (sourceIndex === -1 || targetIndex === -1) return

    ids.splice(sourceIndex, 1)
    ids.splice(ids.indexOf(targetId), 0, sourceId)

    const nextPreferences = { ...launchPreferences, favoriteTerminalIds: ids }
    setLaunchPreferences(nextPreferences)
    saveLaunchPreferences(nextPreferences)
  }

  async function pickAndAddTerminal() {
    const result = await window.brover.launch.pickTerminalApp()
    if (result.canceled) return

    const unsupportedTerminal = !result.terminal && result.error === 'UNSUPPORTED_TERMINAL_APP'
    if (unsupportedTerminal) {
      toast(`${result.appName ?? 'App'} ${t('launch.notTerminal')}`, 'error')
      return
    }

    if (!result.terminal) {
      return
    }

    const pickedTerminal = result.terminal

    setTerminals((prev) => {
      if (prev.some((terminal) => terminal.id === pickedTerminal.id)) {
        return prev
      }

      return [...prev, pickedTerminal]
    })

    addFavoriteTerminal(pickedTerminal.id)
  }

  return (
    <aside
      ref={asideRef}
      className="relative flex h-full flex-col items-center border-r border-edge/60 bg-surface-sidebar px-2 py-4"
    >
      <div className="mt-7 flex w-full flex-1 flex-col items-center gap-2">
        {orderedTerminals.map((terminal) => (
          <button
            key={terminal.id}
            type="button"
            data-testid={`terminal-launch-${terminal.id}`}
            draggable={true}
            className={`flex h-11 w-11 items-center justify-center rounded-xl border transition ${!selectedEnvironmentId ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} border-edge bg-[rgba(15,23,42,0.65)] hover:border-slate-400 hover:bg-surface-hover ${draggingTerminalId === terminal.id ? 'opacity-40' : ''}`}
            onClick={() => {
              if (!selectedEnvironmentId) return
              void launchTerminal(terminal.id)
            }}
            onDragStart={(event) => {
              setDraggingTerminalId(terminal.id)
              event.dataTransfer.effectAllowed = 'move'
              event.dataTransfer.setData('text/plain', terminal.id)
            }}
            onDragEnd={() => setDraggingTerminalId(null)}
            onDragOver={(event) => {
              event.preventDefault()
              event.dataTransfer.dropEffect = 'move'
            }}
            onDrop={(event) => handleDrop(terminal.id, event)}
            onContextMenu={(event) => {
              event.preventDefault()
              setContextMenu({
                terminalId: terminal.id,
                x: Math.max(8, event.clientX),
                y: Math.max(8, event.clientY),
              })
            }}
            title={terminal.name}
            aria-label={terminal.name}
          >
            {terminal.iconDataUrl && (
              <img
                data-testid={`terminal-icon-${terminal.id}`}
                src={terminal.iconDataUrl}
                alt={terminal.name}
                className="h-8 w-8 rounded-md"
              />
            )}
            {!terminal.iconDataUrl && (
              <span className="text-xs font-semibold text-text-base">
                {terminal.name.slice(0, 2).toUpperCase()}
              </span>
            )}
          </button>
        ))}
        <button
          type="button"
          data-testid="terminal-add-button"
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-dashed border-edge text-text-base transition hover:border-slate-400 hover:text-text-emphasis"
          title={t('launch.addTerminal')}
          aria-label={t('launch.addTerminal')}
          onClick={() => void pickAndAddTerminal()}
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {contextMenu && (
        <div className="fixed inset-0 z-30">
          <button
            type="button"
            className="absolute inset-0 cursor-pointer"
            onClick={() => setContextMenu(null)}
          />
          <div
            className="fixed z-40 flex min-w-24 flex-col rounded-lg border border-edge bg-surface-overlay p-1 shadow-xl"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              type="button"
              data-testid={`terminal-remove-${contextMenu.terminalId}`}
              className="cursor-pointer rounded px-2 py-1.5 text-left text-xs text-rose-status hover:bg-surface-hover"
              onClick={() => removeFavoriteTerminal(contextMenu.terminalId)}
            >
              {t('launch.removeTerminal')}
            </button>
          </div>
        </div>
      )}

      <div
        data-testid="terminal-footer"
        className="mt-auto flex min-h-[34px] w-full items-center"
      >
        <select
          data-testid="terminal-locale-select"
          className="w-full cursor-pointer rounded-lg border border-edge bg-surface-base px-1 py-1 text-[10px] text-text-base outline-none focus-visible:ring-2 focus-visible:ring-accent"
          value={locale}
          onChange={(event) =>
            onLocaleChange(event.target.value as 'en' | 'es' | 'pt')
          }
        >
          <option value="en">EN</option>
          <option value="es">ES</option>
          <option value="pt">PT</option>
        </select>
      </div>
    </aside>
  )
})
