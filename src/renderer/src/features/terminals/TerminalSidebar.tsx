import { memo, useEffect, useMemo, useState } from 'react'
import type { TerminalApp } from '../../../../shared/models'
import { getLaunchPreferences, promoteLaunchDefault, saveLaunchPreferences } from '../launch/preferences'

interface TerminalSidebarProps {
  title: string
  subtitle: string
  locale: 'en' | 'es' | 'pt'
  onLocaleChange: (locale: 'en' | 'es' | 'pt') => void
  selectedTargetId: string | null
}

export const TerminalSidebar = memo(function TerminalSidebar(props: TerminalSidebarProps) {
  const { title, subtitle, locale, onLocaleChange, selectedTargetId } = props
  const [terminals, setTerminals] = useState<TerminalApp[]>([])

  useEffect(() => {
    let cancelled = false

    window.brover.launch
      .listTerminals()
      .then(({ terminals: nextTerminals }) => {
        if (cancelled) return
        setTerminals(nextTerminals.filter((terminal) => terminal.installed))
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
    const preferences = getLaunchPreferences(terminals.map((terminal) => terminal.id))
    const rank = new Map(preferences.favoriteTerminalIds.map((id, index) => [id, index]))
    return [...terminals].sort((a, b) => {
      const aRank = rank.get(a.id)
      const bRank = rank.get(b.id)
      if (aRank == null && bRank == null) return a.name.localeCompare(b.name)
      if (aRank == null) return 1
      if (bRank == null) return -1
      return aRank - bRank
    })
  }, [terminals])

  async function launchTerminal(terminalId: string) {
    if (!selectedTargetId) return
    const nextPreferences = promoteLaunchDefault(getLaunchPreferences(terminals.map((terminal) => terminal.id)), terminalId)
    saveLaunchPreferences(nextPreferences)
    await window.brover.launch.terminal(selectedTargetId, terminalId)
  }

  return (
    <aside className="flex h-full flex-col items-center border-r border-edge/60 bg-surface-sidebar px-2 py-4">
      <div className="mt-7 flex w-full flex-1 flex-col items-center gap-2">
        {orderedTerminals.map((terminal) => (
          <button
            key={terminal.id}
            type="button"
            data-testid={`terminal-launch-${terminal.id}`}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-edge bg-[rgba(15,23,42,0.65)] transition hover:border-slate-400 hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!selectedTargetId}
            onClick={() => void launchTerminal(terminal.id)}
            title={terminal.name}
            aria-label={terminal.name}
          >
            {terminal.iconDataUrl ? (
              <img
                data-testid={`terminal-icon-${terminal.id}`}
                src={terminal.iconDataUrl}
                alt={terminal.name}
                className="h-6 w-6 rounded-md"
              />
            ) : (
              <span className="text-xs font-semibold text-text-base">
                {terminal.name.slice(0, 2).toUpperCase()}
              </span>
            )}
          </button>
        ))}
      </div>

      <select className="mt-auto w-full rounded-lg border border-edge bg-surface-base px-1 py-1 text-[10px] text-text-base outline-none focus-visible:ring-2 focus-visible:ring-accent" value={locale} onChange={(event) => onLocaleChange(event.target.value as 'en' | 'es' | 'pt')}>
        <option value="en">EN</option>
        <option value="es">ES</option>
        <option value="pt">PT</option>
      </select>

      <p className="mt-3 text-center text-xs text-slate-500">
        {title} · {subtitle}
      </p>
    </aside>
  )
})
