import { useState } from 'react'
import { useT } from '@/shared/i18n/useT'
import { Icon } from '@/shared/ui/Icon'
import { formatBytes } from '@/shared/lib/format'
import { isOpenable, isStructured } from '@/entities/document'
import { usePrefs } from '@/shared/config/prefs'
import { useWorkspace } from '@/features/workspace'
import { useUi } from '../model/ui'

export function Toolbar() {
  const t = useT()
  const doc = useWorkspace((s) => s.doc)
  const activePath = useWorkspace((s) => s.activePath)
  const reload = useWorkspace((s) => s.reload)
  const navigate = useWorkspace((s) => s.navigate)
  const historyIndex = useWorkspace((s) => s.historyIndex)
  const historyLength = useWorkspace((s) => s.history.length)
  const ui = useUi()
  const outlineOpen = usePrefs((s) => s.outlineOpen)
  const setPref = usePrefs((s) => s.set)
  const [copied, setCopied] = useState(false)

  const segments = (activePath ?? '').split('/').filter(Boolean)
  const canCopy = !!doc && isOpenable(doc.kind)

  function copySource() {
    if (!canCopy) return
    void navigator.clipboard.writeText(doc!.text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    })
  }

  return (
    <header className="toolbar">
      <button
        className="iconbtn"
        onClick={ui.toggleSidebar}
        aria-label={t('sidebar.toggle')}
        aria-pressed={ui.sidebarOpen}
        title={t('sidebar.toggle')}
      >
        <Icon name="panel" />
      </button>

      <div className="toolbar__nav">
        <button
          className="iconbtn"
          disabled={historyIndex <= 0}
          onClick={() => navigate(-1)}
          aria-label={t('shortcuts.nav')}
        >
          <Icon name="arrowLeft" size={15} />
        </button>
        <button
          className="iconbtn"
          disabled={historyIndex >= historyLength - 1}
          onClick={() => navigate(1)}
          aria-label={t('shortcuts.nav')}
        >
          <Icon name="arrowRight" size={15} />
        </button>
      </div>

      <nav className="crumbs" aria-label="path">
        {segments.map((segment, index) => (
          <span key={index} className={index === segments.length - 1 ? 'crumbs__last' : undefined}>
            {segment}
          </span>
        ))}
      </nav>

      {doc && (
        <span className="toolbar__meta">
          {formatBytes(doc.size)}
          {doc.encoding ? ` · ${doc.encoding}` : ''}
        </span>
      )}

      <div className="toolbar__actions">
        <button className="iconbtn" onClick={() => ui.setPalette(true)} title={t('toolbar.search')}>
          <Icon name="search" />
        </button>
        <button
          className="iconbtn"
          onClick={() => ui.setSearchAll(true)}
          aria-pressed={ui.searchAllOpen}
          title={t('toolbar.searchAll')}
        >
          <Icon name="folderSearch" />
        </button>
        <button
          className="iconbtn"
          onClick={() => {
            // 구조적 데이터는 접힌 노드까지 뒤지는 자체 검색이 더 낫다.
            if (doc && isStructured(doc.kind)) {
              document.querySelector<HTMLInputElement>('.data__search input')?.focus()
            } else {
              ui.setFind(!ui.findOpen)
            }
          }}
          disabled={!doc || !isOpenable(doc.kind)}
          aria-pressed={ui.findOpen}
          title={t('toolbar.find')}
        >
          <Icon name="findText" />
        </button>
        {doc?.kind === 'markdown' && (
          <button
            className="iconbtn"
            onClick={() => setPref('outlineOpen', !outlineOpen)}
            aria-pressed={outlineOpen}
            title={t('toolbar.outline')}
          >
            <Icon name="list" />
          </button>
        )}
        <button
          className="iconbtn"
          onClick={() => void reload()}
          disabled={!activePath}
          title={t('toolbar.reload')}
        >
          <Icon name="refresh" />
        </button>
        <button className="iconbtn" onClick={copySource} disabled={!canCopy} title={t('toolbar.copy')}>
          <Icon name={copied ? 'check' : 'copy'} />
        </button>
        <button className="iconbtn" onClick={() => ui.setSettings(true)} title={t('toolbar.settings')}>
          <Icon name="settings" />
        </button>
        <button
          className="iconbtn"
          onClick={() => ui.setShortcuts(true)}
          title={t('toolbar.shortcuts')}
        >
          <Icon name="keyboard" />
        </button>
      </div>
    </header>
  )
}
