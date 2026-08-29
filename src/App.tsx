import { useCallback, useEffect, useRef, useState } from 'react'
import { useApp } from './state/store'
import { useT } from './i18n/useT'
import { Welcome } from './components/Welcome'
import { Sidebar } from './components/Sidebar'
import { Toolbar } from './components/Toolbar'
import { CommandPalette } from './components/CommandPalette'
import { SettingsPanel } from './components/SettingsPanel'
import { ShortcutsDialog } from './components/ShortcutsDialog'
import { MarkdownView } from './viewer/MarkdownView'
import { DataView } from './viewer/DataView'
import { TextView } from './viewer/TextView'
import { readDataTransfer } from './fs/scan'

const MAC = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform || navigator.userAgent)

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  return (
    el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    el.tagName === 'SELECT' ||
    el.isContentEditable
  )
}

export default function App() {
  const t = useT()
  const workspace = useApp((s) => s.workspace)
  const doc = useApp((s) => s.doc)
  const docStatus = useApp((s) => s.docStatus)
  const docError = useApp((s) => s.docError)
  const activePath = useApp((s) => s.activePath)
  const sidebarOpen = useApp((s) => s.sidebarOpen)
  const store = useApp
  const [dragging, setDragging] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const dragDepth = useRef(0)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [activePath])

  // ---- 키보드
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const s = store.getState()
      const mod = MAC ? event.metaKey : event.ctrlKey

      if (event.key === 'Escape') {
        if (s.paletteOpen) s.setPalette(false)
        else if (s.settingsOpen) s.setSettings(false)
        else if (s.shortcutsOpen) s.setShortcuts(false)
        return
      }

      if (mod && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        s.setPalette(!s.paletteOpen)
        return
      }
      if (mod && event.key.toLowerCase() === 'b') {
        event.preventDefault()
        s.toggleSidebar()
        return
      }
      if (mod && event.key === ',') {
        event.preventDefault()
        s.setSettings(true)
        return
      }
      if (mod && (event.key === '=' || event.key === '+')) {
        event.preventDefault()
        s.bumpFontSize(1)
        return
      }
      if (mod && event.key === '-') {
        event.preventDefault()
        s.bumpFontSize(-1)
        return
      }
      if (event.altKey && event.key === 'ArrowLeft') {
        event.preventDefault()
        s.navigate(-1)
        return
      }
      if (event.altKey && event.key === 'ArrowRight') {
        event.preventDefault()
        s.navigate(1)
        return
      }

      if (isTyping(event.target) || mod || event.altKey) return

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        s.step(1)
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        s.step(-1)
      } else if (event.key === 'r') {
        void s.reload()
      } else if (event.key === '?') {
        s.setShortcuts(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [store])

  // ---- 드래그앤드롭
  const onDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault()
      dragDepth.current = 0
      setDragging(false)
      const items = event.dataTransfer.items
      if (!items || items.length === 0) return

      // Chromium 은 드롭된 폴더에서 진짜 디렉토리 핸들을 내준다. 그러면 전체 모드로 연다.
      const first = items[0]
      if (typeof first.getAsFileSystemHandle === 'function') {
        try {
          const handle = await first.getAsFileSystemHandle()
          if (handle && handle.kind === 'directory') {
            await store.getState().openDirectoryHandle(handle as FileSystemDirectoryHandle)
            return
          }
        } catch {
          /* 폴백으로 내려간다 */
        }
      }

      const entries = await readDataTransfer(items)
      if (entries.length > 0) store.getState().openSnapshot(entries)
    },
    [store],
  )

  return (
    <div
      className={`app${sidebarOpen && workspace ? '' : ' app--collapsed'}`}
      onDragEnter={(event) => {
        event.preventDefault()
        dragDepth.current++
        setDragging(true)
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => {
        dragDepth.current = Math.max(0, dragDepth.current - 1)
        if (dragDepth.current === 0) setDragging(false)
      }}
      onDrop={(event) => void onDrop(event)}
    >
      {!workspace ? (
        <Welcome dragging={dragging} />
      ) : (
        <>
          {sidebarOpen && <Sidebar />}
          <main className="main">
            <Toolbar />
            <div className="scroll-area" ref={scrollRef}>
              {docStatus === 'loading' && <p className="state">{t('viewer.loading')}</p>}
              {docStatus === 'error' && (
                <div className="state state--error">
                  <h2>{t('viewer.error')}</h2>
                  <p>
                    {docError?.kind === 'too-large'
                      ? t('viewer.tooLarge', { size: docError.detail ?? '' })
                      : docError?.kind === 'not-found'
                        ? t('viewer.notFound')
                        : docError?.detail}
                  </p>
                </div>
              )}
              {docStatus === 'idle' && (
                <p className="state">{t('viewer.pick', { key: MAC ? '⌘K' : 'Ctrl+K' })}</p>
              )}
              {docStatus === 'ready' && doc && <Document />}
            </div>
          </main>
          {dragging && <div className="dropveil">{t('open.dropActive')}</div>}
        </>
      )}

      <CommandPalette />
      <SettingsPanel />
      <ShortcutsDialog />
    </div>
  )
}

function Document() {
  const doc = useApp((s) => s.doc)!
  if (doc.kind === 'markdown') return <MarkdownView doc={doc} />
  if (doc.kind === 'text') return <TextView doc={doc} />
  return <DataView doc={doc} />
}
