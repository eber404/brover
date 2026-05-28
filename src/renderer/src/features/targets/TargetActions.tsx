import { memo, useState, useEffect, useCallback } from 'react'
import { Button } from '../../components/ui/button'

interface TargetActionsProps {
  targetId: string | null
  dotfilePath: string
  onInject: (targetId: string, dotfilePath: string) => void
  onEject: (targetId: string, dotfilePath: string) => void
  onLaunch: (targetId: string, terminalApp: string) => void
  loading?: boolean
}

interface TerminalOption {
  id: string
  name: string
}

export const TargetActions = memo(function TargetActions({
  targetId,
  dotfilePath,
  onInject,
  onEject,
  onLaunch,
  loading = false,
}: TargetActionsProps) {
  const [isActive, setIsActive] = useState(false)
  const [terminals, setTerminals] = useState<TerminalOption[]>([])
  const [selectedTerminal, setSelectedTerminal] = useState('terminal')

  useEffect(() => {
    if (!targetId) return
    window.brover.inject.status(targetId).then(({ active }) => setIsActive(active))
    window.brover.launch.listTerminals().then(({ terminals }) => {
      setTerminals(terminals.filter(t => t.installed))
    })
    const stored = localStorage.getItem('brover-terminal-app')
    if (stored) setSelectedTerminal(stored)
  }, [targetId])

  const handleInjectToggle = useCallback(() => {
    if (!targetId || !dotfilePath) return
    if (isActive) {
      onEject(targetId, dotfilePath)
      setIsActive(false)
    } else {
      onInject(targetId, dotfilePath)
      setIsActive(true)
    }
  }, [targetId, dotfilePath, isActive, onInject, onEject])

  const handleLaunch = useCallback(() => {
    if (!targetId) return
    onLaunch(targetId, selectedTerminal)
  }, [targetId, selectedTerminal, onLaunch])

  const handleTerminalChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    setSelectedTerminal(val)
    localStorage.setItem('brover-terminal-app', val)
  }, [])

  if (!targetId) return null

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-t border-white/10">
      <Button
        onClick={handleInjectToggle}
        variant={isActive ? 'destructive' : 'default'}
        className="text-xs px-2 py-1"
        disabled={loading}
      >
        {isActive ? 'Eject' : 'Inject'}
      </Button>
      <div className="flex items-center gap-1">
        <Button
          onClick={handleLaunch}
          className="text-xs px-2 py-1"
          disabled={loading}
        >
          Launch
        </Button>
        <select
          value={selectedTerminal}
          onChange={handleTerminalChange}
          className="text-xs bg-transparent border border-white/10 rounded px-1 py-0.5"
        >
          {terminals.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>
    </div>
  )
})
