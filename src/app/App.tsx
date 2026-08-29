import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useT } from '@/shared/i18n/useT'
import { Sidebar, Welcome, readDataTransfer, useWorkspace, visibleFiles } from '@/features/workspace'
import { CommandPalette } from '@/features/quick-open'
import { SettingsPanel } from '@/features/reading-settings'
import { useUi } from './model/ui'
import { useGlobalShortcuts } from './shortcuts'
import { PALETTE_HINT } from './platform'
import { Toolbar } from './ui/Toolbar'
import { ShortcutsDialog } from './ui/ShortcutsDialog'
import { DocumentView } from './ui/DocumentView'

export default function App() {
  const t = useT()
  const workspace = useWorkspace((s) => s.workspace)
  const filter = useWorkspace((s) => s.filter)
  const doc = useWorkspace((s) => s.doc)
  const docStatus = useWorkspace((s) => s.docStatus)
  const docError = useWorkspace((s) => s.docError)
  const activePath = useWorkspace((s) => s.activePath)
  const select = useWorkspace((s) => s.select)
  const ui = useUi()

  const [dragging, setDragging] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const dragDepth = useRef(0)

  useGlobalShortcuts()

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [activePath])

  // 팔레트는 사이드바와 같은 집합을 본다. 트리에 없는 파일이 검색에서 튀어나오지 않는다.
  const pool = useMemo(() => visibleFiles(workspace, filter), [workspace, filter])

  /** 마크다운 안의 상대경로 링크. 없으면 `.md` 를 붙여 한 번 더 찾아본다. */
  const openDoc = useCallback(
    (path: string) => {
      const found =
        workspace?.files.find((file) => file.path === path) ??
        workspace?.files.find((file) => file.path === `${path}.md`)
      if (found) void select(found.path)
    },
    [workspace, select],
  )

  const onDrop = useCallback(async (event: React.DragEvent) => {
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
          await useWorkspace.getState().openDirectoryHandle(handle as FileSystemDirectoryHandle)
          return
        }
      } catch {
        /* 폴백으로 내려간다 */
      }
    }

    const entries = await readDataTransfer(items)
    if (entries.length > 0) useWorkspace.getState().openSnapshot(entries)
  }, [])

  return (
    <div
      className={`app${ui.sidebarOpen && workspace ? '' : ' app--collapsed'}`}
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
          {ui.sidebarOpen && <Sidebar />}
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
                <p className="state">{t('viewer.pick', { key: PALETTE_HINT })}</p>
              )}
              {docStatus === 'ready' && doc && <DocumentView doc={doc} onOpenDoc={openDoc} />}
            </div>
          </main>
          {dragging && <div className="dropveil">{t('open.dropActive')}</div>}
        </>
      )}

      <CommandPalette
        open={ui.paletteOpen}
        files={pool}
        onPick={(path) => {
          ui.setPalette(false)
          void select(path)
        }}
        onClose={() => ui.setPalette(false)}
      />
      <SettingsPanel open={ui.settingsOpen} onClose={() => ui.setSettings(false)} />
      <ShortcutsDialog open={ui.shortcutsOpen} onClose={() => ui.setShortcuts(false)} />
    </div>
  )
}
