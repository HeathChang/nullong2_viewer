import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { isImageName, isStructured } from '@/entities/document'
import { useT } from '@/shared/i18n/useT'
import { Sidebar, Welcome, readDataTransfer, useWorkspace, visibleFiles } from '@/features/workspace'
import { CommandPalette } from '@/features/quick-open'
import { SettingsPanel } from '@/features/reading-settings'
import { FindBar } from '@/features/find'
import { SearchPanel } from '@/features/search-all'
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
  const stale = useWorkspace((s) => s.stale)
  const select = useWorkspace((s) => s.select)
  const reload = useWorkspace((s) => s.reload)
  const checkStale = useWorkspace((s) => s.checkStale)
  const ui = useUi()

  const [dragging, setDragging] = useState(false)
  /** 폴더 전체 검색에서 넘어온 검색어. 그 문서가 열렸을 때만 쓴다. */
  const [seed, setSeed] = useState<{ path: string; query: string } | null>(null)
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null)
  const dragDepth = useRef(0)

  useGlobalShortcuts()

  // ---- 이어 읽기: 파일마다 스크롤 위치를 기억한다.
  const scrollMemory = useRef(new Map<string, number>())
  const activeRef = useRef<string | null>(null)
  useEffect(() => {
    activeRef.current = activePath
  }, [activePath])

  useEffect(() => {
    if (!scrollEl || docStatus !== 'ready' || !activePath) return
    scrollEl.scrollTop = scrollMemory.current.get(activePath) ?? 0
  }, [scrollEl, docStatus, activePath])

  const rememberScroll = useCallback(() => {
    const path = activeRef.current
    if (path && scrollEl) scrollMemory.current.set(path, scrollEl.scrollTop)
  }, [scrollEl])

  // ---- 디스크 변경 감지: 창으로 돌아올 때만 확인하고, 갱신은 사용자가 누른다.
  useEffect(() => {
    const check = () => void checkStale()
    window.addEventListener('focus', check)
    document.addEventListener('visibilitychange', check)
    return () => {
      window.removeEventListener('focus', check)
      document.removeEventListener('visibilitychange', check)
    }
  }, [checkStale])

  // ---- 마크다운 안의 상대경로 이미지
  const imageUrls = useRef(new Map<string, string>())
  useEffect(() => {
    const cache = imageUrls.current
    return () => {
      for (const url of cache.values()) URL.revokeObjectURL(url)
      cache.clear()
    }
  }, [workspace])

  const resolveImage = useCallback(
    async (path: string): Promise<string | null> => {
      const cached = imageUrls.current.get(path)
      if (cached) return cached
      const node = workspace?.files.find((file) => file.path === path)
      if (!node || !isImageName(node.name)) return null
      try {
        const file = node.handle ? await node.handle.getFile() : node.file
        if (!file) return null
        const url = URL.createObjectURL(file)
        imageUrls.current.set(path, url)
        return url
      } catch {
        return null
      }
    },
    [workspace],
  )

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

  // 검색 결과에서 연 문서에만 검색어를 물려준다.
  const seedQuery = seed && seed.path === activePath ? seed.query : ''

  // 마크다운·텍스트는 문서 내 찾기로, 구조적 데이터는 자체 검색으로 이어 붙인다.
  useEffect(() => {
    if (!seedQuery || docStatus !== 'ready' || !doc) return
    if (!isStructured(doc.kind)) ui.setFind(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedQuery, docStatus, doc?.kind])

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
            {stale && (
              <div className="stale" role="status">
                <span>{t('doc.stale')}</span>
                <button className="linkbtn" onClick={() => void reload()}>
                  {t('doc.reloadNow')}
                </button>
              </div>
            )}
            <div className="scroll-area" ref={setScrollEl} onScroll={rememberScroll}>
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
              {docStatus === 'ready' && doc && (
                <DocumentView
                  doc={doc}
                  onOpenDoc={openDoc}
                  resolveImage={resolveImage}
                  initialQuery={seedQuery}
                />
              )}
            </div>
            <FindBar
              open={ui.findOpen}
              container={scrollEl}
              resetKey={activePath}
              seed={seedQuery}
              onClose={() => ui.setFind(false)}
            />
          </main>
          {dragging && <div className="dropveil">{t('open.dropActive')}</div>}
        </>
      )}

      <SearchPanel
        open={ui.searchAllOpen}
        files={pool}
        onOpen={(path, query) => {
          ui.setSearchAll(false)
          setSeed({ path, query })
          void select(path)
        }}
        onClose={() => ui.setSearchAll(false)}
      />
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
