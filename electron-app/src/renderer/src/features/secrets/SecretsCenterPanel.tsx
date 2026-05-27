import { memo } from 'react'

interface SecretsCenterPanelProps {
  children: React.ReactNode
}

export const SecretsCenterPanel = memo(function SecretsCenterPanel(
  props: SecretsCenterPanelProps
) {
  const { children } = props

  return (
    <div className="flex h-full flex-col border-r border-edge/60 bg-panel/85">
      <section className="flex min-h-0 flex-1 flex-col p-4">
        <div className="flex-1 overflow-y-auto">{children}</div>
      </section>
    </div>
  )
})
