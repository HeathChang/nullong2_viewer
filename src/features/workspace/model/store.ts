import { create } from 'zustand'
import type { FileKind, FileNode, LoadedDoc, Workspace } from '@/entities/document'
import { isOpenable } from '@/entities/document'
import { formatBytes } from '@/shared/lib/format'
import { FileTooLargeError, readDoc, readMeta } from '@/shared/lib/read'
import { buildSnapshotWorkspace, scanDirectoryHandle } from './scan'
import {
  defaultFilter,
  loadFilter,
  saveFilter,
  visibleFiles,
  type FileFilter,
} from './filter'
import {
  ensurePermission,
  forgetDirectory,
  loadRecents,
  rememberDirectory,
  type RecentEntry,
} from './persist'

export type DocStatus = 'idle' | 'loading' | 'ready' | 'error'
export type OpenStatus = 'idle' | 'scanning'
export type OpenError = 'denied' | 'failed'

export interface DocError {
  kind: 'too-large' | 'not-found' | 'unknown'
  detail?: string
}

interface WorkspaceState {
  workspace: Workspace | null
  recents: RecentEntry[]
  openStatus: OpenStatus
  scanCount: number
  openError: OpenError | null

  filter: FileFilter

  activePath: string | null
  doc: LoadedDoc | null
  docStatus: DocStatus
  docError: DocError | null
  /** 열어 둔 사이에 디스크에서 파일이 바뀌었는가 */
  stale: boolean

  history: string[]
  historyIndex: number

  refreshRecents: () => Promise<void>
  pickDirectory: () => Promise<void>
  openDirectoryHandle: (handle: FileSystemDirectoryHandle) => Promise<void>
  openRecent: (entry: RecentEntry) => Promise<void>
  dropRecent: (id: string) => Promise<void>
  openSnapshot: (entries: { file: File; path: string }[]) => void
  closeWorkspace: () => void

  toggleKind: (kind: FileKind) => void
  setIncludeHidden: (value: boolean) => void
  showEverything: () => void

  select: (path: string, options?: { history?: boolean }) => Promise<void>
  reload: () => Promise<void>
  checkStale: () => Promise<void>
  navigate: (delta: number) => void
  step: (delta: number) => void
}

export const useWorkspace = create<WorkspaceState>((set, get) => ({
  workspace: null,
  recents: [],
  openStatus: 'idle',
  scanCount: 0,
  openError: null,

  filter: defaultFilter(),

  activePath: null,
  doc: null,
  docStatus: 'idle',
  docError: null,
  stale: false,

  history: [],
  historyIndex: -1,

  refreshRecents: async () => set({ recents: await loadRecents() }),

  dropRecent: async (id) => {
    await forgetDirectory(id)
    set({ recents: await loadRecents() })
  },

  pickDirectory: async () => {
    if (!window.showDirectoryPicker) return
    let handle: FileSystemDirectoryHandle
    try {
      // 이 버전은 읽기 전용이다. 쓰기 권한은 요청하지 않는다.
      handle = await window.showDirectoryPicker({ id: 'nullong-root', mode: 'read' })
    } catch {
      return // 사용자가 취소한 경우
    }
    await adopt(handle, set, get)
  },

  openDirectoryHandle: async (handle) => {
    if (!(await ensurePermission(handle))) {
      set({ openError: 'denied' })
      return
    }
    await adopt(handle, set, get)
  },

  openRecent: async (entry) => {
    if (!(await ensurePermission(entry.handle))) {
      set({ openError: 'denied' })
      return
    }
    await adopt(entry.handle, set, get)
  },

  openSnapshot: (entries) => {
    const workspace = buildSnapshotWorkspace(entries)
    const filter = loadFilter(workspace.name)
    set({ workspace, filter, openStatus: 'idle', openError: null, ...blankDoc() })
    autoSelect(workspace, filter, get)
  },

  closeWorkspace: () => set({ workspace: null, openError: null, ...blankDoc() }),

  toggleKind: (kind) => {
    const { filter, workspace } = get()
    const kinds = filter.kinds.includes(kind)
      ? filter.kinds.filter((k) => k !== kind)
      : [...filter.kinds, kind]
    commitFilter({ ...filter, kinds }, workspace, set)
  },

  setIncludeHidden: (includeHidden) => {
    const { filter, workspace } = get()
    commitFilter({ ...filter, includeHidden }, workspace, set)
  },

  showEverything: () => {
    const { workspace } = get()
    const kinds = [...new Set((workspace?.files ?? []).map((node) => node.kind))]
    commitFilter({ kinds, includeHidden: true }, workspace, set)
  },

  select: async (path, options) => {
    const node = get().workspace?.files.find((file) => file.path === path)
    if (!node) {
      set({ activePath: path, doc: null, docStatus: 'error', docError: { kind: 'not-found' } })
      return
    }
    set({ activePath: path, docStatus: 'loading', docError: null, stale: false })
    if (options?.history !== false) pushHistory(path, set, get)

    try {
      const doc = isOpenable(node.kind) ? await readDoc(node) : await readStub(node)
      // 읽는 도중 다른 파일로 옮겨갔다면 결과를 버린다.
      if (get().activePath !== path) return
      set({ doc, docStatus: 'ready', docError: null })
    } catch (err) {
      if (get().activePath !== path) return
      set({
        doc: null,
        docStatus: 'error',
        docError:
          err instanceof FileTooLargeError
            ? { kind: 'too-large', detail: formatBytes(err.size) }
            : { kind: 'unknown', detail: err instanceof Error ? err.message : String(err) },
      })
    }
  },

  reload: async () => {
    const path = get().activePath
    if (path) await get().select(path, { history: false })
  },

  /**
   * 창에 포커스가 돌아올 때 디스크의 수정 시각만 다시 본다.
   * 몰래 갱신하지 않는다 — 읽던 자리가 사라지는 게 더 불편하다.
   */
  checkStale: async () => {
    const { doc, workspace, stale } = get()
    if (!doc || stale) return
    const node = workspace?.files.find((file) => file.path === doc.path)
    if (!node?.handle) return
    try {
      const meta = await readMeta(node)
      if (meta.lastModified !== doc.lastModified) set({ stale: true })
    } catch {
      /* 파일이 사라졌을 수도 있다. 조용히 넘어간다 */
    }
  },

  navigate: (delta) => {
    const { history, historyIndex } = get()
    const next = historyIndex + delta
    if (next < 0 || next >= history.length) return
    set({ historyIndex: next })
    void get().select(history[next], { history: false })
  },

  step: (delta) => {
    const list = visibleFiles(get().workspace, get().filter)
    if (list.length === 0) return
    const current = list.findIndex((file) => file.path === get().activePath)
    const next = current === -1 ? 0 : (current + delta + list.length) % list.length
    void get().select(list[next].path)
  },
}))

// ---------------------------------------------------------------- helpers

type Setter = (partial: Partial<WorkspaceState>) => void
type Getter = () => WorkspaceState

function blankDoc() {
  return {
    activePath: null,
    doc: null,
    docStatus: 'idle' as DocStatus,
    docError: null,
    stale: false,
    history: [] as string[],
    historyIndex: -1,
  }
}

/** 못 여는 형식은 내용 대신 크기·수정 시각만 담는다. */
async function readStub(node: FileNode): Promise<LoadedDoc> {
  const meta = await readMeta(node)
  return { path: node.path, name: node.name, kind: node.kind, text: '', encoding: '', ...meta }
}

function commitFilter(filter: FileFilter, workspace: Workspace | null, set: Setter) {
  set({ filter })
  if (workspace) saveFilter(workspace.name, filter)
}

async function adopt(handle: FileSystemDirectoryHandle, set: Setter, get: Getter) {
  set({ openStatus: 'scanning', scanCount: 0, openError: null })
  try {
    const workspace = await scanDirectoryHandle(handle, {
      onProgress: (n) => set({ scanCount: n }),
    })
    await rememberDirectory(handle)
    const filter = loadFilter(workspace.name)
    set({ workspace, filter, openStatus: 'idle', ...blankDoc() })
    set({ recents: await loadRecents() })
    autoSelect(workspace, filter, get)
  } catch {
    set({ openStatus: 'idle', openError: 'failed' })
  }
}

/** 폴더를 열면 README 같은 시작점을 알아서 띄워 준다. */
function autoSelect(workspace: Workspace, filter: FileFilter, get: Getter) {
  const pool = visibleFiles(workspace, filter)
  const preferred =
    pool.find((f) => /^readme\.mdx?$/i.test(f.name) && !f.path.includes('/')) ??
    pool.find((f) => /^readme\.mdx?$/i.test(f.name)) ??
    pool.find((f) => f.kind === 'markdown') ??
    pool.find((f) => isOpenable(f.kind))
  if (preferred) void get().select(preferred.path)
}

function pushHistory(path: string, set: Setter, get: Getter) {
  const { history, historyIndex } = get()
  if (history[historyIndex] === path) return
  const trimmed = [...history.slice(0, historyIndex + 1), path].slice(-100)
  set({ history: trimmed, historyIndex: trimmed.length - 1 })
}
