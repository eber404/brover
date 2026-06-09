import { memo, useRef, useState } from 'react'
import { Layers, Plus, Trash2 } from 'lucide-react'
import type { Environment } from '../../../../shared/models'
import { ConfirmDialog } from '../../components/ui/confirmDialog'
import { Switch } from '../../components/ui/switch'
import { useI18n } from '../../i18n'

interface EnvironmentsSidebarProps {
  title: string
  subtitle: string
  environments: Environment[]
  selectedEnvironmentId: string | null
  sharedSecretNames: boolean
  editingEnvironmentId: string | null
  editingName: string
  onEditNameChange: (value: string) => void
  onAddEnvironment: () => void
  onStartRenameEnvironment: (environmentId: string, currentName: string) => void
  onSaveRenameEnvironment: (environmentId: string) => void
  onSelectEnvironment: (environmentId: string) => void
  onUpdateEnvironmentColor: (environmentId: string, color: string) => void
  onReorderEnvironments: (orderedEnvironmentIds: string[]) => void
  onDeleteEnvironment: (environmentId: string) => void
  onToggleSharedSecretNames: () => void
}

export const EnvironmentsSidebar = memo(function EnvironmentsSidebar(props: EnvironmentsSidebarProps) {
  const {
    title,
    subtitle,
    environments,
    selectedEnvironmentId,
    sharedSecretNames,
    editingEnvironmentId,
    editingName,
    onEditNameChange,
    onAddEnvironment,
    onStartRenameEnvironment,
    onSaveRenameEnvironment,
    onSelectEnvironment,
    onUpdateEnvironmentColor,
    onReorderEnvironments,
    onDeleteEnvironment,
    onToggleSharedSecretNames,
  } = props

  const { t } = useI18n()
  const asideRef = useRef<HTMLElement | null>(null)
  const presetColors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899']
  const [pendingDeleteEnvironment, setPendingDeleteEnvironment] = useState<Environment | null>(null)
  const [colorMenu, setColorMenu] = useState<{ environmentId: string; x: number; y: number } | null>(null)
  const [nameTooltip, setNameTooltip] = useState<{ text: string; x: number; y: number } | null>(null)
  const [draggingEnvironmentId, setDraggingEnvironmentId] = useState<string | null>(null)
  const pendingDeleteDescription = pendingDeleteEnvironment
    ? `Remove ${pendingDeleteEnvironment.name} and environment-scoped values.`
    : ''

  function applyEnvironmentColor(environmentId: string, color: string) {
    onUpdateEnvironmentColor(environmentId, color)
    setColorMenu(null)
  }

  function openColorMenu(environmentId: string, element: HTMLElement) {
    const aside = asideRef.current
    if (!aside) return
    const dotRect = element.getBoundingClientRect()
    const asideRect = aside.getBoundingClientRect()
    const panelWidth = 176
    const nextX = Math.min(dotRect.left - asideRect.left, aside.clientWidth - panelWidth - 8)
    const nextY = dotRect.bottom - asideRect.top + 8
    setColorMenu({ environmentId, x: Math.max(8, nextX), y: nextY })
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

  function renderEnvironmentNameCell(environment: Environment) {
    if (editingEnvironmentId === environment.id) {
      return (
        <input
          autoFocus
          className="h-8 flex-1 rounded border border-edge bg-surface-base px-2 text-sm text-text-base"
          data-testid={`environment-rename-${environment.id}`}
          value={editingName}
          placeholder="dev, prod, staging..."
          onChange={(event) => onEditNameChange(event.target.value)}
          onBlur={() => void onSaveRenameEnvironment(environment.id)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              void onSaveRenameEnvironment(environment.id)
            }
          }}
        />
      )
    }

    return (
      <div className={`min-w-0 flex-1 overflow-hidden rounded px-2 py-1 text-left text-sm ${selectedEnvironmentId === environment.id ? 'text-accent' : 'text-text-base'}`}>
        <span
          className="inline-block max-w-full overflow-hidden text-ellipsis whitespace-nowrap align-top"
          data-testid={`environment-name-${environment.id}`}
          onMouseEnter={(event) => showNameTooltip(environment.name, event.currentTarget)}
          onMouseLeave={() => setNameTooltip(null)}
        >
          {environment.name}
        </span>
      </div>
    )
  }

  return (
    <aside ref={asideRef} className="relative flex h-full min-w-0 flex-col border-r border-edge/60 bg-surface-sidebar p-4 pt-3">
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-text-muted" />
        <h1 className="text-sm font-semibold tracking-wide text-text-base">ENVIRONMENTS</h1>
        <button onClick={onAddEnvironment} className="ml-auto cursor-pointer rounded p-1 text-text-base hover:bg-surface-hover" data-testid="environment-add">
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-2 flex items-center justify-between rounded border border-edge/60 bg-surface-base px-2 py-1.5">
        <div className="group/tt relative">
          <span className="text-[11px] text-text-base">Matching secret names</span>
          <div className="pointer-events-none absolute left-0 top-[calc(100%+6px)] z-30 hidden w-56 rounded-md border border-edge bg-surface-overlay px-2 py-1.5 text-[11px] text-text-base shadow-lg group-hover/tt:block">
            {t('environments.matchingSecretNamesTooltip')}
          </div>
        </div>
        <Switch checked={sharedSecretNames} onCheckedChange={onToggleSharedSecretNames} label="Matching secret names" />
      </div>

      <div data-testid="environments-list" className="mt-3 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="grid gap-1.5">
          {environments.map((environment) => (
            <div
              key={environment.id}
              data-testid={`environment-row-${environment.id}`}
              className={`group relative flex w-full cursor-pointer items-center gap-2 overflow-hidden rounded-md border px-1 py-1 ${selectedEnvironmentId === environment.id ? 'border-edge/70 bg-accent/15' : 'border-transparent hover:bg-surface-hover'} ${draggingEnvironmentId === environment.id ? 'opacity-50' : ''}`}
              draggable={editingEnvironmentId !== environment.id}
              onClick={() => onSelectEnvironment(environment.id)}
              onDoubleClick={() => onStartRenameEnvironment(environment.id, environment.name)}
              onDragStart={(event) => {
                setDraggingEnvironmentId(environment.id)
                event.dataTransfer.effectAllowed = 'move'
                event.dataTransfer.setData('text/plain', environment.id)
              }}
              onDragEnd={() => setDraggingEnvironmentId(null)}
              onDragOver={(event) => {
                event.preventDefault()
                event.dataTransfer.dropEffect = 'move'
              }}
              onDrop={(event) => {
                event.preventDefault()
                const droppedId = event.dataTransfer.getData('text/plain') || draggingEnvironmentId
                if (!droppedId || droppedId === environment.id) return
                const ids = environments.map((item) => item.id)
                const fromIndex = ids.indexOf(droppedId)
                const toIndex = ids.indexOf(environment.id)
                if (fromIndex < 0 || toIndex < 0) return
                const next = [...ids]
                const [moved] = next.splice(fromIndex, 1)
                if (!moved) return
                next.splice(toIndex, 0, moved)
                onReorderEnvironments(next)
              }}
            >
              <button type="button" className="ml-1 flex h-2.5 w-2.5 cursor-pointer shrink-0 items-center justify-center rounded-full border border-edge" data-testid={`environment-color-${environment.id}`} onClick={(event) => openColorMenu(environment.id, event.currentTarget)}>
                <span className="block h-full w-full rounded-full" style={{ backgroundColor: environment.color }} />
              </button>
              <div className="min-w-0 flex-1 pr-2">{renderEnvironmentNameCell(environment)}</div>
              {editingEnvironmentId !== environment.id && (
                <button
                  className={`shrink-0 cursor-pointer rounded p-1 transition ${selectedEnvironmentId === environment.id ? 'text-text-muted hover:bg-surface-hover hover:text-rose-status' : 'pointer-events-none opacity-0 text-slate-500 group-hover:pointer-events-auto group-hover:opacity-100 group-hover:hover:bg-surface-hover group-hover:hover:text-rose-status'}`}
                  data-testid={`environment-delete-${environment.id}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    setPendingDeleteEnvironment(environment)
                  }}
                  title="Delete environment"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div
        data-testid="environments-footer"
        className="mt-auto flex min-h-[34px] items-center justify-center text-center text-xs text-slate-500"
      >
        {title} · {subtitle}
      </div>

      <ConfirmDialog
        open={!!pendingDeleteEnvironment}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteEnvironment(null)
        }}
        title="Delete environment?"
        description={pendingDeleteDescription}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={() => {
          if (pendingDeleteEnvironment) onDeleteEnvironment(pendingDeleteEnvironment.id)
        }}
      />

      {colorMenu && (
        <div className="absolute inset-0 z-30">
          <button type="button" className="absolute inset-0 cursor-pointer" onClick={() => setColorMenu(null)} />
          <div className="absolute flex w-44 flex-col gap-2 rounded-lg border border-edge bg-surface-overlay p-2 shadow-xl" style={{ left: colorMenu.x, top: colorMenu.y }} data-testid="environment-color-menu">
            <div className="grid grid-cols-5 gap-1">
              {presetColors.map((color) => (
                <button key={color} type="button" className="h-5 w-5 cursor-pointer rounded-full border border-edge" style={{ backgroundColor: color }} onClick={() => applyEnvironmentColor(colorMenu.environmentId, color)} title={color} />
              ))}
            </div>
            <label className="flex items-center gap-2 rounded border border-edge bg-surface-base px-2 py-1 text-[11px] text-text-base">
              Custom
              <input
                type="color"
                className="h-5 w-8 cursor-pointer rounded border border-edge bg-transparent"
                value={environments.find((environment) => environment.id === colorMenu.environmentId)?.color ?? '#f59e0b'}
                onChange={(event) => applyEnvironmentColor(colorMenu.environmentId, event.target.value)}
              />
            </label>
          </div>
        </div>
      )}

      {nameTooltip && (
        <div className="pointer-events-none absolute z-30 max-w-[260px] rounded-md border border-edge bg-surface-overlay px-2 py-1 text-xs text-text-emphasis shadow-lg" style={{ left: nameTooltip.x, top: nameTooltip.y }}>
          {nameTooltip.text}
        </div>
      )}
    </aside>
  )
})
