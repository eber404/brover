import { memo, useRef, useState } from 'react'
import { Layers, Plus, Trash2 } from 'lucide-react'
import type { EnvSpace, EnvTarget } from '../../../../shared/models'
import { ConfirmDialog } from '../../components/ui/confirmDialog'
import { Switch } from '../../components/ui/switch'

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
  onDeleteSpace: (spaceId: string) => void
  onToggleSpaceTiedSecrets: (spaceId: string) => void
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
    onDeleteSpace,
    onToggleSpaceTiedSecrets,
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
  const [spaceContextMenu, setSpaceContextMenu] = useState<{
    spaceId: string
    x: number
    y: number
  } | null>(null)
  const [pendingDeleteSpace, setPendingDeleteSpace] = useState<string | null>(
    null
  )
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
          className="h-8 flex-1 rounded border border-edge bg-surface-base px-2 text-sm text-text-base"
          data-testid={`target-rename-${target.id}`}
          value={editingName}
          placeholder="dev, prod, staging..."
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
      selectedTargetId === target.id ? 'text-accent' : 'text-text-base'
    return (
      <div
        className={`min-w-0 flex-1 overflow-hidden rounded px-2 py-1 text-left text-sm ${selectedClass}`}
      >
        <span
          className="inline-block max-w-full overflow-hidden text-ellipsis whitespace-nowrap align-top"
          data-testid={`target-name-${target.id}`}
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
      <div className="flex w-[84px] flex-col items-center border-r border-edge/60 bg-surface-sidebar px-2 py-4">
        <div className="mt-7 flex w-full flex-1 flex-col items-center gap-2">
          {allSpaces.map((space) => {
            const isSelected = selectedSpace?.id === space.id
            return (
              <button
                key={space.id}
                className={`relative flex h-11 w-11 items-center justify-center rounded-xl border text-xs font-semibold transition ${isSelected ? 'border-slate-100 text-slate-50' : 'border-edge text-text-base hover:border-slate-400 hover:text-text-emphasis'}`}
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
                onContextMenu={(event) => {
                  event.preventDefault()
                  setSpaceContextMenu({ spaceId: space.id, x: event.clientX, y: event.clientY })
                }}
                title={space.name}
              >
                {getSpaceBadge(space)}
              </button>
            )
          })}

          <button
            onClick={onAddSpace}
            className="mt-1 flex h-11 w-11 items-center justify-center rounded-xl border border-dashed border-edge text-text-base hover:border-slate-400 hover:text-text-emphasis"
            title="Add directory space"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        <select
          className="mt-auto w-full rounded-lg border border-edge bg-surface-base px-1 py-1 text-[10px] text-text-base outline-none focus-visible:ring-2 focus-visible:ring-accent"
          value={locale}
          onChange={(e) => onLocaleChange(e.target.value as 'en' | 'es' | 'pt')}
        >
          <option value="en">EN</option>
          <option value="es">ES</option>
          <option value="pt">PT</option>
        </select>
      </div>

      <div className="flex min-w-0 flex-1 flex-col bg-surface-sidebar p-4 pt-3">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-text-muted" />
          <h1 className="text-sm font-semibold tracking-wide text-text-base">
            TARGETS
          </h1>
          <button
            onClick={() => selectedSpace && onAddTarget(selectedSpace.id)}
            className="ml-auto rounded p-1 text-text-base hover:bg-surface-hover"
            data-testid="target-add"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between rounded border border-edge/60 bg-surface-base px-2 py-1.5">
          <div className="group/tt relative">
            <span className="text-[011px] text-text-base">Tied targets</span>
            <div className="pointer-events-none absolute top-[calc(100%+6px)] left-0 z-30 hidden w-56 rounded-md border border-edge bg-surface-overlay px-2 py-1.5 text-[11px] text-text-base shadow-lg group-hover/tt:block">
              Keep env names synced across all targets in this space. Values remain target-specific.
            </div>
          </div>
          <Switch
            checked={selectedSpace?.tiedSecrets ?? false}
            onCheckedChange={() => selectedSpace && onToggleSpaceTiedSecrets(selectedSpace.id)}
            label="Tied targets"
          />
        </div>
        <div className="mt-3 grid gap-1.5 overflow-y-auto overflow-x-hidden">
          {selectedTargets.map((target) => (
            <div
              key={target.id}
              data-testid={`target-row-${target.id}`}
              className={`group relative flex w-full cursor-pointer items-center gap-2 overflow-hidden rounded-md border px-1 py-1 ${selectedTargetId === target.id ? 'border-edge/70 bg-accent/15' : 'border-transparent hover:bg-surface-hover'} ${draggingTargetId === target.id ? 'opacity-50' : ''}`}
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
                data-testid={`target-color-${target.id}`}
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
              {editingTargetId !== target.id && (
                <button
                  className={`shrink-0 rounded p-1 transition ${selectedTargetId === target.id ? 'text-text-muted hover:bg-surface-hover hover:text-rose-status' : 'pointer-events-none opacity-0 text-slate-500 group-hover:pointer-events-auto group-hover:opacity-100 group-hover:hover:bg-surface-hover group-hover:hover:text-rose-status'}`}
                  data-testid={`target-delete-${target.id}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    setPendingDeleteTarget(target)
                  }}
                  title="Delete target"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        <p className="mt-auto pt-3 text-xs text-slate-500">
          {title} · {subtitle}
        </p>
      </div>

      <ConfirmDialog
        open={!!pendingDeleteTarget}
        onOpenChange={(open) => { if (!open) setPendingDeleteTarget(null) }}
        title="Delete target?"
        description={
          pendingDeleteTarget
            ? `Remove ${pendingDeleteTarget.name} and target-scoped values.`
            : ''
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={() => {
          if (pendingDeleteTarget) onDeleteTarget(pendingDeleteTarget.id)
        }}
      />

      {colorMenu ? (
        <div className="absolute inset-0 z-30">
          <button
            type="button"
            className="absolute inset-0"
            onClick={() => setColorMenu(null)}
          />
          <div
            className="absolute flex w-44 flex-col gap-2 rounded-lg border border-edge bg-surface-overlay p-2 shadow-xl"
            style={{ left: colorMenu.x, top: colorMenu.y }}
            data-testid="target-color-menu"
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
            <label className="flex items-center gap-2 rounded border border-edge bg-surface-base px-2 py-1 text-[11px] text-text-base">
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

      {spaceContextMenu ? (
        <div className="absolute inset-0 z-30">
          <button
            type="button"
            className="absolute inset-0"
            onClick={() => setSpaceContextMenu(null)}
          />
          <div
            className="absolute flex w-36 flex-col rounded-lg border border-edge bg-surface-overlay p-1 shadow-xl"
            style={{ left: spaceContextMenu.x, top: spaceContextMenu.y }}
          >
            <button
              className="rounded px-2 py-1.5 text-left text-xs text-text-base hover:bg-surface-hover"
              onClick={() => {
                const space = allSpaces.find((s) => s.id === spaceContextMenu.spaceId)
                if (space) onStartRenameSpace(space.id, space.name)
                setSpaceContextMenu(null)
              }}
            >
              Rename
            </button>
            <button
              className="rounded px-2 py-1.5 text-left text-xs text-rose-status hover:bg-surface-hover"
              onClick={() => {
                setPendingDeleteSpace(spaceContextMenu.spaceId)
                setSpaceContextMenu(null)
              }}
            >
              Delete
            </button>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={!!pendingDeleteSpace}
        onOpenChange={(open) => { if (!open) setPendingDeleteSpace(null) }}
        title="Delete space?"
        description="This will remove all targets and secrets in this space."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={() => {
          if (pendingDeleteSpace) onDeleteSpace(pendingDeleteSpace)
        }}
      />

      {nameTooltip ? (
        <div
          className="pointer-events-none absolute z-30 max-w-[260px] rounded-md border border-edge bg-surface-overlay px-2 py-1 text-xs text-text-emphasis shadow-lg"
          style={{ left: nameTooltip.x, top: nameTooltip.y }}
        >
          {nameTooltip.text}
        </div>
      ) : null}
    </aside>
  )
})
