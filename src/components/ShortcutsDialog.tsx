import { useApp } from '../state/store'
import { useT } from '../i18n/useT'
import { Icon } from './Icon'
import type { MsgKey } from '../i18n/ko'

const MAC = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform || navigator.userAgent)
const MOD = MAC ? '⌘' : 'Ctrl'

const ROWS: [string[], MsgKey][] = [
  [[`${MOD}K`], 'shortcuts.palette'],
  [['↑', '↓'], 'shortcuts.tree'],
  [[MAC ? '⌥←' : 'Alt+←', MAC ? '⌥→' : 'Alt+→'], 'shortcuts.nav'],
  [[`${MOD}B`], 'shortcuts.sidebar'],
  [[`${MOD},`], 'shortcuts.settings'],
  [[`${MOD}+`, `${MOD}−`], 'shortcuts.zoom'],
  [['R'], 'shortcuts.reload'],
  [['?'], 'shortcuts.help'],
]

export function ShortcutsDialog() {
  const t = useT()
  const open = useApp((s) => s.shortcutsOpen)
  const setShortcuts = useApp((s) => s.setShortcuts)
  if (!open) return null

  return (
    <div className="overlay" onMouseDown={() => setShortcuts(false)}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={t('shortcuts.title')}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="panel__head">
          <h2>{t('shortcuts.title')}</h2>
          <button className="iconbtn" onClick={() => setShortcuts(false)} aria-label={t('common.close')}>
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
