import { useState } from 'react'
import { useApp, formatBytes } from '../state/store'
import { useT } from '../i18n/useT'
import { Icon } from './Icon'

export function Toolbar() {
  const t = useT()
  const doc = useApp((s) => s.doc)
  const activePath = useApp((s) => s.activePath)
  const toggleSidebar = useApp((s) => s.toggleSidebar)
  const sidebarOpen = useApp((s) => s.sidebarOpen)
  const reload = useApp((s) => s.reload)
  const setPalette = useApp((s) => s.setPalette)
  const setSettings = useApp((s) => s.setSettings)
  const setShortcuts = useApp((s) => s.setShortcuts)
  const navigate = useApp((s) => s.navigate)
  const historyIndex = useApp((s) => s.historyIndex)
  const historyLength = useApp((s) => s.history.length)
  const [copied, setCopied] = useState(false)

  const segments = (activePath ?? '').split('/').filter(Boolean)

  function copySource() {
    if (!doc) return
    void navigator.clipboard.writeText(doc.text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    })
  }

  return (
    <header className="toolbar">
      <button
        className="iconbtn"
        onClick={toggleSidebar}
        aria-label={t('sidebar.toggle')}
        aria-pressed={sidebarOpen}
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
          {formatBytes(doc.size)} · {doc.encoding}
        </span>
      )}

      <div className="toolbar__actions">
        <button className="iconbtn" onClick={() => setPalette(true)} title={t('toolbar.search')}>
          <Icon name="search" />
        </button>
        <button
          className="iconbtn"
          onClick={() => void reload()}
          disabled={!activePath}
          title={t('toolbar.reload')}
        >
          <Icon name="refresh" />
        </button>
        <button className="iconbtn" onClick={copySource} disabled={!doc} title={t('toolbar.copy')}>
          <Icon name={copied ? 'check' : 'copy'} />
        </button>
        <button className="iconbtn" onClick={() => setSettings(true)} title={t('toolbar.settings')}>
          <Icon name="settings" />
        </button>
        <button
          className="iconbtn"
          onClick={() => setShortcuts(true)}
          title={t('toolbar.shortcuts')}
        >
          <Icon name="keyboard" />
        </button>
      </div>
    </header>
  )
}
