import { memo, useRef, useState } from 'react'
import { Layers, Plus, Trash2 } from 'lucide-react'
import type { EnvSpace, EnvTarget } from '../../../../shared/models'

interface SpacesSidebarProps {
  title: string
  subtitle: string
  shellSpaces: EnvSpace[]
  dirSpaces: EnvSpace[]
  targetsBySpace: Map<string, EnvTarget[]>
  selectedSpaceId: string | null
  selectedTargetId: string | null
  editingSpaceId: string | null
  editingSpaceName: string
  editingTargetId: string | null
  editingName: string
  locale: 'en' | 'es' | 'pt'
  onLocaleChange: (locale: 'en' | 'es' | 'pt') => void
  onEditNameChange: (value: string) => void
  onAddSpace: () => void
  onStartRenameSpace: (spaceId: string, currentName: string) => void
  onSaveRenameSpace: (spaceId: string) => void
  onEditSpaceNameChange: (value: string) => void
  onSelectSpace: (spaceId: string, firstTargetId: string | undefined) => void
  onAddTarget: (spaceId: string) => void
  onStartRenameTarget: (targetId: string, currentName: string) => void
  onSaveRenameTarget: (targetId: string) => void
  onSelectTarget: (spaceId: string, targetId: string) => void
  onUpdateTargetColor: (targetId: string, color: string) => void
  onReorderTargets: (spaceId: string, orderedTargetIds: string[]) => void
  onDeleteTarget: (targetId: string) => void
}

export const SpacesSidebar = memo(function SpacesSidebar(
  props: SpacesSidebarProps
) {
  const {
    title,
    subtitle,
    shellSpaces,
    dirSpaces,
    targetsBySpace,
    selectedSpaceId,
    selectedTargetId,
    editingSpaceId,
    editingSpaceName,
    editingTargetId,
    editingName,
    locale,
    onLocaleChange,
    onEditNameChange,
    onAddSpace,
    onStartRenameSpace,
    onSaveRenameSpace,
    onEditSpaceNameChange,
    onSelectSpace,
    onAddTarget,
    onStartRenameTarget,
    onSaveRenameTarget,
    onSelectTarget,
    onUpdateTargetColor,
    onReorderTargets,
    onDeleteTarget,
  } = props

  const allSpaces = [...shellSpaces, ...dirSpaces]
  const selectedSpace =
    allSpaces.find((space) => space.id === selectedSpaceId) ??
    allSpaces[0] ??
    null
  const selectedTargets = selectedSpace
    ? (targetsBySpace.get(selectedSpace.id) ?? [])
    : []
  const presetColors = [
    '#ef4444',
    '#f97316',
    '#f59e0b',
    '#84cc16',
    '#10b981',
    '#06b6d4',
    '#3b82f6',
    '#8b5cf6',
    '#ec4899',
  ]
  const [pendingDeleteTarget, setPendingDeleteTarget] =
    useState<EnvTarget | null>(null)
  const [colorMenu, setColorMenu] = useState<{
    targetId: string
    x: number
    y: number
  } | null>(null)
  const [nameTooltip, setNameTooltip] = useState<{
    text: string
    x: number
    y: number
  } | null>(null)
  const [draggingTargetId, setDraggingTargetId] = useState<string | null>(null)
  const asideRef = useRef<HTMLElement | null>(null)

  function applyTargetColor(targetId: string, color: string) {
    onUpdateTargetColor(targetId, color)
    setColorMenu(null)
  }

  function openColorMenu(targetId: string, element: HTMLElement) {
    const aside = asideRef.current
    if (!aside) return
    const dotRect = element.getBoundingClientRect()
    const asideRect = aside.getBoundingClientRect()
    const panelWidth = 176
    const nextX = Math.min(
      dotRect.left - asideRect.left,
      aside.clientWidth - panelWidth - 8
    )
    const nextY = dotRect.bottom - asideRect.top + 8
    setColorMenu({ targetId, x: Math.max(8, nextX), y: nextY })
  }

  function showNameTooltip(text: string, element: HTMLElement) {
    const aside = asideRef.current
    if (!aside) return
    const itemRect = element.getBoundingClientRect()
    const asideRect = aside.getBoundingClientRect()
    setNameTooltip({
      text,
      x: Math.max(8, itemRect.left - asideRect.left + 8),
      y: itemRect.bottom - asideRect.top + 6,
    })
  }

  function getSpaceBadge(space: EnvSpace) {
    const words = space.name.trim().split(/\s+/).filter(Boolean)
    if (words.length >= 2)
      return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase()
    return space.name.slice(0, 2).toUpperCase()
  }

  function renderTargetNameCell(target: EnvTarget) {
    if (editingTargetId === target.id) {
      return (
        <input
          autoFocus
          className="h-8 flex-1 rounded border border-edge bg-slate-900 px-2 text-sm"
          value={editingName}
          placeholder="Prod..."
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

    const selectedClass =
      selectedTargetId === target.id ? 'text-accent' : 'text-slate-300'
    return (
      <div
        className={`min-w-0 flex-1 overflow-hidden rounded px-2 py-1 text-left text-sm ${selectedClass}`}
      >
        <span
          className="inline-block max-w-full overflow-hidden text-ellipsis whitespace-nowrap align-top"
          onMouseEnter={(event) =>
            showNameTooltip(target.name, event.currentTarget)
          }
          onMouseLeave={() => setNameTooltip(null)}
        >
          {target.name}
        </span>
      </div>
    )
  }

  return (
    <aside
      ref={asideRef}
      className="relative flex h-full border-r border-edge/60 bg-panel/90"
    >
      <div className="flex w-[84px] flex-col items-center border-r border-edge/60 bg-slate-950/50 px-2 py-4">
        <div className="mt-7 flex w-full flex-1 flex-col items-center gap-2">
          {allSpaces.map((space) => {
            const isSelected = selectedSpace?.id === space.id
            return (
              <button
                key={space.id}
                className={`flex h-11 w-11 items-center justify-center rounded-xl border text-xs font-semibold transition ${isSelected ? 'border-slate-100 text-slate-50' : 'border-edge text-slate-300 hover:border-slate-400 hover:text-slate-100'}`}
                style={{
                  backgroundColor: isSelected
                    ? 'rgba(30,41,59,0.95)'
                    : 'rgba(15,23,42,0.65)',
                }}
                onClick={() =>
                  onSelectSpace(
                    space.id,
                    (targetsBySpace.get(space.id) ?? [])[0]?.id
                  )
                }
                onDoubleClick={() => onStartRenameSpace(space.id, space.name)}
                title={space.name}
              >
                {getSpaceBadge(space)}
              </button>
            )
          })}

          <button
            onClick={onAddSpace}
            className="mt-1 flex h-11 w-11 items-center justify-center rounded-xl border border-dashed border-edge text-slate-300 hover:border-slate-400 hover:text-slate-100"
            title="Add directory space"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        <select
          className="mt-auto w-full rounded-lg border border-edge bg-slate-900 px-1 py-1 text-[10px] text-slate-300 outline-none focus-visible:ring-2 focus-visible:ring-accent"
          value={locale}
          onChange={(e) => onLocaleChange(e.target.value as 'en' | 'es' | 'pt')}
        >
          <option value="en">EN</option>
          <option value="es">ES</option>
          <option value="pt">PT</option>
        </select>
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-4 pt-3">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-slate-400" />
          <h1 className="text-sm font-semibold tracking-wide text-slate-200">
            TARGETS
          </h1>
          <button
            onClick={() => selectedSpace && onAddTarget(selectedSpace.id)}
            className="ml-auto rounded p-1 text-slate-300 hover:bg-slate-900"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 grid gap-1.5 overflow-y-auto overflow-x-hidden">
          {selectedTargets.map((target) => (
            <div
              key={target.id}
              className={`group relative flex w-full cursor-pointer items-center gap-2 overflow-hidden rounded-md border px-1 py-1 ${selectedTargetId === target.id ? 'border-edge/70 bg-accent/15' : 'border-transparent hover:bg-slate-900/60'} ${draggingTargetId === target.id ? 'opacity-50' : ''}`}
              draggable={editingTargetId !== target.id}
              onClick={() =>
                selectedSpace && onSelectTarget(selectedSpace.id, target.id)
              }
              onDoubleClick={() => onStartRenameTarget(target.id, target.name)}
              onDragStart={(event) => {
                setDraggingTargetId(target.id)
                event.dataTransfer.effectAllowed = 'move'
                event.dataTransfer.setData('text/plain', target.id)
              }}
              onDragEnd={() => setDraggingTargetId(null)}
              onDragOver={(event) => {
                event.preventDefault()
                event.dataTransfer.dropEffect = 'move'
              }}
              onDrop={(event) => {
                event.preventDefault()
                const droppedId =
                  event.dataTransfer.getData('text/plain') || draggingTargetId
                if (!selectedSpace || !droppedId || droppedId === target.id)
                  return
                const ids = selectedTargets.map((item) => item.id)
                const fromIndex = ids.indexOf(droppedId)
                const toIndex = ids.indexOf(target.id)
                if (fromIndex < 0 || toIndex < 0) return
                const next = [...ids]
                const [moved] = next.splice(fromIndex, 1)
                if (!moved) return
                next.splice(toIndex, 0, moved)
                onReorderTargets(selectedSpace.id, next)
              }}
            >
              <button
                type="button"
                className="ml-1 flex h-2.5 w-2.5 shrink-0 items-center justify-center rounded-full border border-edge"
                onClick={(event) =>
                  openColorMenu(target.id, event.currentTarget)
                }
              >
                <span
                  className="block h-full w-full rounded-full"
                  style={{ backgroundColor: target.color }}
                />
              </button>
              <div className="min-w-0 flex-1 pr-2">
                {renderTargetNameCell(target)}
              </div>
              <button
                className={`shrink-0 rounded p-1 transition ${selectedTargetId === target.id ? 'text-slate-400 hover:bg-slate-900 hover:text-rose-300' : 'pointer-events-none opacity-0 text-slate-500 group-hover:pointer-events-auto group-hover:opacity-100 group-hover:hover:bg-slate-900 group-hover:hover:text-rose-300'}`}
                onClick={(event) => {
                  event.stopPropagation()
                  setPendingDeleteTarget(target)
                }}
                title="Delete target"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        <p className="mt-auto pt-3 text-xs text-slate-500">
          {title} · {subtitle}
        </p>
      </div>

      {pendingDeleteTarget ? (
        <div className="absolute inset-0 z-40 flex items-center justify-center rounded-2xl bg-slate-950/70 p-4">
          <div className="w-full max-w-xs rounded-xl border border-edge bg-slate-900 p-4">
            <div className="text-sm font-semibold text-slate-100">
              Delete target?
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Remove{' '}
              <span className="text-slate-200">{pendingDeleteTarget.name}</span>{' '}
              and target-scoped values.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
                onClick={() => setPendingDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                className="rounded bg-rose-600 px-2 py-1 text-xs text-white hover:bg-rose-500"
                onClick={() => {
                  void onDeleteTarget(pendingDeleteTarget.id)
                  setPendingDeleteTarget(null)
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {colorMenu ? (
        <div className="absolute inset-0 z-30">
          <button
            type="button"
            className="absolute inset-0"
            onClick={() => setColorMenu(null)}
          />
          <div
            className="absolute flex w-44 flex-col gap-2 rounded-lg border border-edge bg-slate-950/95 p-2 shadow-xl"
            style={{ left: colorMenu.x, top: colorMenu.y }}
          >
            <div className="grid grid-cols-5 gap-1">
              {presetColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  className="h-5 w-5 rounded-full border border-edge"
                  style={{ backgroundColor: color }}
                  onClick={() => applyTargetColor(colorMenu.targetId, color)}
                  title={color}
                />
              ))}
            </div>
            <label className="flex items-center gap-2 rounded border border-edge bg-slate-900 px-2 py-1 text-[11px] text-slate-300">
              Custom
              <input
                type="color"
                className="h-5 w-8 cursor-pointer rounded border border-edge bg-transparent"
                value={
                  selectedTargets.find(
                    (target) => target.id === colorMenu.targetId
                  )?.color ?? '#f59e0b'
                }
                onChange={(event) =>
                  applyTargetColor(colorMenu.targetId, event.target.value)
                }
              />
            </label>
          </div>
        </div>
      ) : null}

      {nameTooltip ? (
        <div
          className="pointer-events-none absolute z-30 max-w-[260px] rounded-md border border-edge bg-slate-950 px-2 py-1 text-xs text-slate-100 shadow-lg"
          style={{ left: nameTooltip.x, top: nameTooltip.y }}
        >
          {nameTooltip.text}
        </div>
      ) : null}
    </aside>
  )
})
