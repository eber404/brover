import { Trash2 } from 'lucide-react'
import type { AppAuthorization } from '../../../../shared/models'
import { useI18n } from '../../i18n'
import { Button } from '../../components/ui/button'
import { Switch } from '../../components/ui/switch'

interface AppsDetailProps {
  app: AppAuthorization | null
  enabled: boolean
  onToggleEnabled: () => void
  onDelete: () => void
}

export function AppsDetail({ app, enabled, onToggleEnabled, onDelete }: AppsDetailProps) {
  const { t } = useI18n()
  const statusLabel = enabled ? t('secrets.enabled') : t('secrets.disabled')

  if (!app) {
    return <p className="text-text-muted">{t('apps.selectApp')}</p>
  }

  return (
    <div className="grid gap-3">
      <div>
        <div className="text-lg font-semibold">{app.displayName}</div>
        <div className="text-xs text-text-muted">{app.bundleID}</div>
      </div>
      <div className="flex items-center gap-3">
        <Switch checked={enabled} onCheckedChange={() => onToggleEnabled()} label={statusLabel} />
        <span className="text-sm text-text-base">{statusLabel}</span>
      </div>
      <Button variant="destructive" onClick={() => onDelete()}>
        <Trash2 className="mr-2 h-4 w-4" />
        {t('apps.deleteApp')}
      </Button>
    </div>
  )
}
