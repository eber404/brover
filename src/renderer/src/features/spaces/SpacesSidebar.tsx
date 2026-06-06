import { memo, useRef, useState } from 'react'
import { Layers, Plus, Trash2 } from 'lucide-react'
import type { EnvTarget } from '../../../../shared/models'
import { ConfirmDialog } from '../../components/ui/confirmDialog'
import { Switch } from '../../components/ui/switch'
import { useI18n } from '../../i18n'

interface SpacesSidebarProps {
  title: string
  subtitle: string
  targets: EnvTarget[]
  selectedTargetId: string | null
  tiedTargets: boolean
  editingTargetId: string | null
  editingName: string
  onEditNameChange: (value: string) => void
  onAddTarget: () => void
  onStartRenameTarget: (targetId: string, currentName: string) => void
  onSaveRenameTarget: (targetId: string) => void
  onSelectTarget: (targetId: string) => void
  onUpdateTargetColor: (targetId: string, color: string) => void
  onReorderTargets: (orderedTargetIds: string[]) => void
  onDeleteTarget: (targetId: string) => void
  onToggleTiedTargets: () => void
}

export const SpacesSidebar = memo(function SpacesSidebar(props: SpacesSidebarProps) {
  const {
    title,
    subtitle,
    targets,
    selectedTargetId,
    tiedTargets,
    editingTargetId,
    editingName,
    onEditNameChange,
    onAddTarget,
    onStartRenameTarget,
    onSaveRenameTarget,
    onSelectTarget,
    onUpdateTargetColor,
    onReorderTargets,
    onDeleteTarget,
    onToggleTiedTargets,
  } = props

  const { t } = useI18n()
  const asideRef = useRef<HTMLElement | null>(null)
  const presetColors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899']
  const [pendingDeleteTarget, setPendingDeleteTarget] = useState<EnvTarget | null>(null)
  const [colorMenu, setColorMenu] = useState<{ targetId: string; x: number; y: number } | null>(null)
  const [nameTooltip, setNameTooltip] = useState<{ text: string; x: number; y: number } | null>(null)
  const [draggingTargetId, setDraggingTargetId] = useState<string | null>(null)

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
    const nextX = Math.min(dotRect.left - asideRect.left, aside.clientWidth - panelWidth - 8)
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

    return (
      <div className={`min-w-0 flex-1 overflow-hidden rounded px-2 py-1 text-left text-sm ${selectedTargetId === target.id ? 'text-accent' : 'text-text-base'}`}>
        <span
          className="inline-block max-w-full overflow-hidden text-ellipsis whitespace-nowrap align-top"
          data-testid={`target-name-${target.id}`}
          onMouseEnter={(event) => showNameTooltip(target.name, event.currentTarget)}
          onMouseLeave={() => setNameTooltip(null)}
        >
          {target.name}
        </span>
      </div>
    )
  }

  return (
    <aside ref={asideRef} className="relative flex h-full min-w-0 flex-col border-r border-edge/60 bg-surface-sidebar p-4 pt-3">
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-text-muted" />
        <h1 className="text-sm font-semibold tracking-wide text-text-base">TARGETS</h1>
        <button onClick={onAddTarget} className="ml-auto cursor-pointer rounded p-1 text-text-base hover:bg-surface-hover" data-testid="target-add">
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-2 flex items-center justify-between rounded border border-edge/60 bg-surface-base px-2 py-1.5">
        <div className="group/tt relative">
          <span className="text-[11px] text-text-base">Tied targets</span>
          <div className="pointer-events-none absolute left-0 top-[calc(100%+6px)] z-30 hidden w-56 rounded-md border border-edge bg-surface-overlay px-2 py-1.5 text-[11px] text-text-base shadow-lg group-hover/tt:block">
            {t('spaces.tiedTargetsTooltip')}
          </div>
        </div>
        <Switch checked={tiedTargets} onCheckedChange={onToggleTiedTargets} label="Tied targets" />
      </div>

      <div data-testid="targets-list" className="mt-3 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="grid gap-1.5">
        {targets.map((target) => (
          <div
            key={target.id}
            data-testid={`target-row-${target.id}`}
            className={`group relative flex w-full cursor-pointer items-center gap-2 overflow-hidden rounded-md border px-1 py-1 ${selectedTargetId === target.id ? 'border-edge/70 bg-accent/15' : 'border-transparent hover:bg-surface-hover'} ${draggingTargetId === target.id ? 'opacity-50' : ''}`}
            draggable={editingTargetId !== target.id}
            onClick={() => onSelectTarget(target.id)}
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
              const droppedId = event.dataTransfer.getData('text/plain') || draggingTargetId
              if (!droppedId || droppedId === target.id) return
              const ids = targets.map((item) => item.id)
              const fromIndex = ids.indexOf(droppedId)
              const toIndex = ids.indexOf(target.id)
              if (fromIndex < 0 || toIndex < 0) return
              const next = [...ids]
              const [moved] = next.splice(fromIndex, 1)
              if (!moved) return
              next.splice(toIndex, 0, moved)
              onReorderTargets(next)
            }}
          >
            <button type="button" className="ml-1 flex h-2.5 w-2.5 cursor-pointer shrink-0 items-center justify-center rounded-full border border-edge" data-testid={`target-color-${target.id}`} onClick={(event) => openColorMenu(target.id, event.currentTarget)}>
              <span className="block h-full w-full rounded-full" style={{ backgroundColor: target.color }} />
            </button>
            <div className="min-w-0 flex-1 pr-2">{renderTargetNameCell(target)}</div>
            {editingTargetId !== target.id ? (
              <button
                className={`shrink-0 cursor-pointer rounded p-1 transition ${selectedTargetId === target.id ? 'text-text-muted hover:bg-surface-hover hover:text-rose-status' : 'pointer-events-none opacity-0 text-slate-500 group-hover:pointer-events-auto group-hover:opacity-100 group-hover:hover:bg-surface-hover group-hover:hover:text-rose-status'}`}
                data-testid={`target-delete-${target.id}`}
                onClick={(event) => {
                  event.stopPropagation()
                  setPendingDeleteTarget(target)
                }}
                title="Delete target"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        ))}
        </div>
      </div>

      <div
        data-testid="targets-footer"
        className="mt-auto flex min-h-[34px] items-center justify-center text-center text-xs text-slate-500"
      >
        {title} · {subtitle}
      </div>

      <ConfirmDialog
        open={!!pendingDeleteTarget}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteTarget(null)
        }}
        title="Delete target?"
        description={pendingDeleteTarget ? `Remove ${pendingDeleteTarget.name} and target-scoped values.` : ''}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={() => {
          if (pendingDeleteTarget) onDeleteTarget(pendingDeleteTarget.id)
        }}
      />

      {colorMenu ? (
        <div className="absolute inset-0 z-30">
          <button type="button" className="absolute inset-0 cursor-pointer" onClick={() => setColorMenu(null)} />
          <div className="absolute flex w-44 flex-col gap-2 rounded-lg border border-edge bg-surface-overlay p-2 shadow-xl" style={{ left: colorMenu.x, top: colorMenu.y }} data-testid="target-color-menu">
            <div className="grid grid-cols-5 gap-1">
              {presetColors.map((color) => (
                <button key={color} type="button" className="h-5 w-5 cursor-pointer rounded-full border border-edge" style={{ backgroundColor: color }} onClick={() => applyTargetColor(colorMenu.targetId, color)} title={color} />
              ))}
            </div>
            <label className="flex items-center gap-2 rounded border border-edge bg-surface-base px-2 py-1 text-[11px] text-text-base">
              Custom
              <input
                type="color"
                className="h-5 w-8 cursor-pointer rounded border border-edge bg-transparent"
                value={targets.find((target) => target.id === colorMenu.targetId)?.color ?? '#f59e0b'}
                onChange={(event) => applyTargetColor(colorMenu.targetId, event.target.value)}
              />
            </label>
          </div>
        </div>
      ) : null}

      {nameTooltip ? (
        <div className="pointer-events-none absolute z-30 max-w-[260px] rounded-md border border-edge bg-surface-overlay px-2 py-1 text-xs text-text-emphasis shadow-lg" style={{ left: nameTooltip.x, top: nameTooltip.y }}>
          {nameTooltip.text}
        </div>
      ) : null}
    </aside>
  )
})
