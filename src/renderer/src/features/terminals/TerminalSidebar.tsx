import { memo, useEffect, useMemo, useState } from 'react'
import { Monitor, Play } from 'lucide-react'
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
    <aside className="flex h-full flex-col border-r border-edge/60 bg-panel/90 px-4 py-3">
      <div className="flex items-center gap-2">
        <Monitor className="h-4 w-4 text-text-muted" />
        <h1 className="text-sm font-semibold tracking-wide text-text-base">TERMINALS</h1>
      </div>

      <div className="mt-3 grid gap-2">
        {orderedTerminals.map((terminal) => (
          <button
            key={terminal.id}
            type="button"
            data-testid={`terminal-launch-${terminal.id}`}
            className="flex items-center gap-2 rounded-lg border border-edge bg-surface-card px-3 py-2 text-left text-sm text-text-base hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!selectedTargetId}
            onClick={() => void launchTerminal(terminal.id)}
          >
            <Play className="h-4 w-4 text-accent" />
            <span>{terminal.name}</span>
          </button>
        ))}
      </div>

      <select className="mt-auto w-full rounded-lg border border-edge bg-surface-base px-2 py-2 text-xs text-text-base outline-none focus-visible:ring-2 focus-visible:ring-accent" value={locale} onChange={(event) => onLocaleChange(event.target.value as 'en' | 'es' | 'pt')}>
        <option value="en">EN</option>
        <option value="es">ES</option>
        <option value="pt">PT</option>
      </select>

      <p className="mt-3 text-xs text-slate-500">
        {title} · {subtitle}
      </p>
    </aside>
  )
})
