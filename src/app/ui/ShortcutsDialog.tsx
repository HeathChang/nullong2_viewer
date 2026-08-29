import { useT } from '@/shared/i18n/useT'
import { Icon } from '@/shared/ui/Icon'
import type { MsgKey } from '@/shared/i18n/ko'
import { IS_MAC, MOD_LABEL } from '../platform'

const ROWS: [string[], MsgKey][] = [
  [[`${MOD_LABEL}K`], 'shortcuts.palette'],
  [[`${MOD_LABEL}F`], 'shortcuts.find'],
  [[`${MOD_LABEL}⇧F`], 'shortcuts.searchAll'],
  [[`${MOD_LABEL}⇧O`], 'shortcuts.outline'],
  [['↑', '↓'], 'shortcuts.tree'],
  [[IS_MAC ? '⌥←' : 'Alt+←', IS_MAC ? '⌥→' : 'Alt+→'], 'shortcuts.nav'],
  [[`${MOD_LABEL}B`], 'shortcuts.sidebar'],
  [[`${MOD_LABEL},`], 'shortcuts.settings'],
  [[`${MOD_LABEL}+`, `${MOD_LABEL}−`], 'shortcuts.zoom'],
  [['R'], 'shortcuts.reload'],
  [['?'], 'shortcuts.help'],
]

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT()
  if (!open) return null

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={t('shortcuts.title')}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="panel__head">
          <h2>{t('shortcuts.title')}</h2>
          <button className="iconbtn" onClick={onClose} aria-label={t('common.close')}>
            <Icon name="close" />
          </button>
        </header>
        <dl className="keys">
          {ROWS.map(([combo, key]) => (
            <div key={key}>
              <dt>
                {combo.map((entry) => (
                  <kbd key={entry}>{entry}</kbd>
                ))}
              </dt>
              <dd>{t(key)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}
