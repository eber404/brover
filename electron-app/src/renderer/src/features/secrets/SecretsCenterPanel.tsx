import { memo } from 'react'
import { Search } from 'lucide-react'

interface SecretsCenterPanelProps {
  searchText: string
  placeholder: string
  onSearchChange: (value: string) => void
  children: React.ReactNode
}

export const SecretsCenterPanel = memo(function SecretsCenterPanel(props: SecretsCenterPanelProps) {
  const { searchText, placeholder, onSearchChange, children } = props

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 rounded-xl border border-edge bg-slate-950/60 px-3 py-2">
        <Search className="h-4 w-4 shrink-0 text-slate-500" />
        <input
          className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
          placeholder={placeholder}
          value={searchText}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>

      <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-edge bg-panel/85 p-4">
        <div className="flex-1 overflow-y-auto">{children}</div>
      </section>
    </div>
  )
})
