import { memo } from 'react'
import { ChevronDown, ChevronRight, Folder, Plus, ShieldCheck } from 'lucide-react'
import type { EnvSpace, EnvTarget } from '../../../../shared/models'

interface SpacesSidebarProps {
  title: string
  subtitle: string
  spacesLabel: string
  spaces: EnvSpace[]
  targetsBySpace: Map<string, EnvTarget[]>
  selectedSpaceId: string | null
  selectedTargetId: string | null
  editingTargetId: string | null
  editingName: string
  locale: 'en' | 'es' | 'pt'
  onLocaleChange: (locale: 'en' | 'es' | 'pt') => void
  onEditNameChange: (value: string) => void
  onAddSpace: () => void
  onToggleSpace: (spaceId: string) => void
  onSelectSpace: (spaceId: string, firstTargetId: string | undefined) => void
  onAddTarget: (spaceId: string) => void
  onStartRenameTarget: (targetId: string, currentName: string) => void
  onSaveRenameTarget: (targetId: string) => void
  onSelectTarget: (spaceId: string, targetId: string) => void
  onUpdateTargetColor: (targetId: string, color: string) => void
}

export const SpacesSidebar = memo(function SpacesSidebar(props: SpacesSidebarProps) {
  const {
    title,
    subtitle,
    spacesLabel,
    spaces,
    targetsBySpace,
    selectedSpaceId,
    selectedTargetId,
    editingTargetId,
    editingName,
    locale,
    onLocaleChange,
    onEditNameChange,
    onAddSpace,
    onToggleSpace,
    onSelectSpace,
    onAddTarget,
    onStartRenameTarget,
    onSaveRenameTarget,
    onSelectTarget,
    onUpdateTargetColor,
  } = props

  function renderSpaceChevron(expanded: boolean) {
    if (expanded) return <ChevronDown className="h-4 w-4" />
    return <ChevronRight className="h-4 w-4" />
  }

  function renderTargetNameCell(spaceId: string, target: EnvTarget) {
    if (editingTargetId === target.id) {
      return (
        <input
          autoFocus
          className="h-7 flex-1 rounded border border-edge bg-slate-900 px-2 text-xs"
          value={editingName}
          onChange={(event) => onEditNameChange(event.target.value)}
          onBlur={() => void onSaveRenameTarget(target.id)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              void onSaveRenameTarget(target.id)
            }
          }}
        />
      )
    }

    const selectedClass = selectedTargetId === target.id ? 'bg-accent/15 text-accent' : 'text-slate-300'
    return (
      <button
        className={`flex-1 truncate rounded px-2 py-1 text-left text-xs ${selectedClass}`}
        onClick={() => onSelectTarget(spaceId, target.id)}
        onDoubleClick={() => onStartRenameTarget(target.id, target.name)}
      >
        {target.name}
      </button>
    )
  }

  return (
    <aside className="flex flex-col rounded-2xl border border-edge bg-panel/90 p-4 pt-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-accent" />
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
      </div>
      <p className="mt-1 text-xs text-slate-400">{subtitle}</p>

      <div className="mt-6 mb-2 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">{spacesLabel}</div>
        <button onClick={onAddSpace} className="rounded p-1 text-slate-300 hover:bg-slate-900">
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-1.5 overflow-y-auto">
        {spaces.map((space) => {
          const spaceTargets = targetsBySpace.get(space.id) ?? []
          return (
            <div key={space.id} className="rounded-lg border border-edge/40 bg-slate-950/20 p-1.5">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onToggleSpace(space.id)}
                  className="rounded p-1 text-slate-300 hover:bg-slate-900"
                >
                  {renderSpaceChevron(Boolean(space.expanded))}
                </button>
                <Folder className="h-4 w-4 text-slate-400" />
                <button
                  className={`min-w-0 flex-1 truncate rounded px-2 py-1 text-left ${selectedSpaceId === space.id ? 'text-accent' : 'text-slate-200'}`}
                  onClick={() => onSelectSpace(space.id, spaceTargets[0]?.id)}
                >
                  {space.name}
                </button>
                <button onClick={() => onAddTarget(space.id)} className="rounded p-1 text-slate-300 hover:bg-slate-900">
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              {space.expanded && (
                <div className="mt-1 grid gap-1 pl-6">
                  {spaceTargets.map((target) => (
                    <div key={target.id} className="flex items-center gap-2 rounded px-1 py-1 hover:bg-slate-900/60">
                      {renderTargetNameCell(space.id, target)}

                      <label className="relative h-4 w-4 cursor-pointer overflow-hidden rounded-full border border-edge">
                        <input
                          type="color"
                          className="absolute inset-0 h-full w-full opacity-0"
                          value={target.color}
                          onChange={(event) => onUpdateTargetColor(target.id, event.target.value)}
                        />
                        <span className="block h-full w-full" style={{ backgroundColor: target.color }} />
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-auto pt-6">
        <select
          className="w-full rounded-lg border border-edge bg-slate-900 px-2 py-1.5 text-xs text-slate-300 outline-none focus-visible:ring-2 focus-visible:ring-accent"
          value={locale}
          onChange={(e) => onLocaleChange(e.target.value as 'en' | 'es' | 'pt')}
        >
          <option value="en">English</option>
          <option value="es">Espanol</option>
          <option value="pt">Portugues</option>
        </select>
      </div>
    </aside>
  )
})
