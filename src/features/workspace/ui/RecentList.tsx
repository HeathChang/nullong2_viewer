import { useT } from '@/shared/i18n/useT'
import { Icon } from '@/shared/ui/Icon'
import { formatWhen } from '@/shared/lib/format'
import { useWorkspace } from '../model/store'

export function RecentList() {
  const t = useT()
  const recents = useWorkspace((s) => s.recents)
  const openRecent = useWorkspace((s) => s.openRecent)
  const dropRecent = useWorkspace((s) => s.dropRecent)

  if (recents.length === 0) return null

  return (
    <section className="recents">
      <h2 className="recents__title">{t('open.recent')}</h2>
      <ul className="recents__list">
        {recents.map((entry) => (
          <li key={entry.id}>
            <button className="recents__open" onClick={() => void openRecent(entry)}>
              <Icon name="folder" />
              <span className="recents__name">{entry.name}</span>
              <span className="recents__when">{formatWhen(entry.openedAt)}</span>
            </button>
            <button
              className="recents__forget"
              title={t('open.forget')}
              aria-label={t('open.forget')}
              onClick={() => void dropRecent(entry.id)}
            >
              <Icon name="trash" size={14} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
