import { create } from 'zustand'
import type { FileNode, LoadedDoc, Workspace } from '../types'
import { buildSnapshotWorkspace, scanDirectoryHandle } from '../fs/scan'
import { FileTooLargeError, readDoc } from '../fs/read'
import {
  ensurePermission,
  forgetDirectory,
  loadRecents,
  rememberDirectory,
  type RecentEntry,
} from '../fs/persist'
import {
  applyPrefs,
  clamp,
  defaultPrefs,
  FONT_SIZE_RANGE,
  loadPrefs,
  savePrefs,
  type Prefs,
} from './prefs'

export type DocStatus = 'idle' | 'loading' | 'ready' | 'error'
export type OpenStatus = 'idle' | 'scanning'

export interface DocError {
  kind: 'too-large' | 'not-found' | 'unknown'
  detail?: string
}

interface AppState {
  prefs: Prefs
  workspace: Workspace | null
  recents: RecentEntry[]
  openStatus: OpenStatus
  scanCount: number
  openError: string | null

  activePath: string | null
  doc: LoadedDoc | null
  docStatus: DocStatus
  docError: DocError | null

  history: string[]
  historyIndex: number

  sidebarOpen: boolean
  paletteOpen: boolean
  settingsOpen: boolean
  shortcutsOpen: boolean

  setPref: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void
  resetPrefs: () => void
  bumpFontSize: (delta: number) => void

  refreshRecents: () => Promise<void>
  pickDirectory: () => Promise<void>
  openDirectoryHandle: (handle: FileSystemDirectoryHandle) => Promise<void>
  openRecent: (entry: RecentEntry) => Promise<void>
  dropRecent: (id: string) => Promise<void>
  openSnapshot: (entries: { file: File; path: string }[]) => void
  closeWorkspace: () => void

  select: (path: string, options?: { history?: boolean }) => Promise<void>
  reload: () => Promise<void>
  navigate: (delta: number) => void
  step: (delta: number) => void

  toggleSidebar: () => void
  setPalette: (open: boolean) => void
  setSettings: (open: boolean) => void
  setShortcuts: (open: boolean) => void
}

const initialPrefs = loadPrefs()
applyPrefs(initialPrefs)

function findNode(ws: Workspace | null, path: string | null): FileNode | undefined {
  if (!ws || !path) return undefined
  return ws.files.find((f) => f.path === path)
}

export const useApp = create<AppState>((set, get) => ({
  prefs: initialPrefs,
  workspace: null,
  recents: [],
  openStatus: 'idle',
  scanCount: 0,
  openError: null,

  activePath: null,
  doc: null,
  docStatus: 'idle',
  docError: null,

  history: [],
  historyIndex: -1,

  sidebarOpen: true,
  paletteOpen: false,
  settingsOpen: false,
  shortcutsOpen: false,

  setPref: (key, value) => {
    const prefs = { ...get().prefs, [key]: value }
    savePrefs(prefs)
    applyPrefs(prefs)
    set({ prefs })
  },

  resetPrefs: () => {
    // 표시 언어는 사용자가 고른 값을 유지한다.
    const prefs = { ...defaultPrefs(), lang: get().prefs.lang }
    savePrefs(prefs)
    applyPrefs(prefs)
    set({ prefs })
  },

  bumpFontSize: (delta) => {
    const prefs = get().prefs
    get().setPref('fontSize', clamp(prefs.fontSize + delta, FONT_SIZE_RANGE))
  },

  refreshRecents: async () => set({ recents: await loadRecents() }),

  dropRecent: async (id) => {
    await forgetDirectory(id)
    set({ recents: await loadRecents() })
  },

  pickDirectory: async () => {
    if (!window.showDirectoryPicker) return
    let handle: FileSystemDirectoryHandle
    try {
      // 읽기 권한만 먼저 받는다. 쓰기는 편집을 켤 때 따로 요청한다.
      handle = await window.showDirectoryPicker({ id: 'zzaim-root', mode: 'read' })
    } catch {
      return // 사용자가 취소한 경우
    }
    await adoptHandle(handle, set, get)
  },

  openDirectoryHandle: async (handle) => {
    if (!(await ensurePermission(handle, 'read'))) {
      set({ openError: 'denied' })
      return
    }
    await adoptHandle(handle, set, get)
  },

  openRecent: async (entry) => {
    if (!(await ensurePermission(entry.handle, 'read'))) {
      set({ openError: 'denied' })
      return
    }
    await adoptHandle(entry.handle, set, get)
  },

  openSnapshot: (entries) => {
    const workspace = buildSnapshotWorkspace(entries)
    set({ workspace, openStatus: 'idle', openError: null, ...blankDoc() })
    autoSelect(workspace, get)
  },

  closeWorkspace: () =>
    set({ workspace: null, openError: null, sidebarOpen: true, ...blankDoc() }),

  select: async (path, options) => {
    const node = findNode(get().workspace, path)
    if (!node) {
      set({ activePath: path, doc: null, docStatus: 'error', docError: { kind: 'not-found' } })
      return
    }
    set({ activePath: path, docStatus: 'loading', docError: null, paletteOpen: false })
    if (options?.history !== false) pushHistory(path, set, get)
    try {
      const doc = await readDoc(node)
      // 읽는 도중 다른 파일로 옮겨갔다면 결과를 버린다.
      if (get().activePath !== path) return
      set({ doc, docStatus: 'ready', docError: null })
    } catch (err) {
      if (get().activePath !== path) return
      const docError: DocError =
        err instanceof FileTooLargeError
          ? { kind: 'too-large', detail: formatBytes(err.size) }
          : { kind: 'unknown', detail: err instanceof Error ? err.message : String(err) }
      set({ doc: null, docStatus: 'error', docError })
    }
  },

  reload: async () => {
    const path = get().activePath
    if (path) await get().select(path, { history: false })
  },

  navigate: (delta) => {
    const { history, historyIndex } = get()
    const next = historyIndex + delta
    if (next < 0 || next >= history.length) return
    set({ historyIndex: next })
    void get().select(history[next], { history: false })
  },

  step: (delta) => {
    const { workspace, activePath, prefs } = get()
    if (!workspace) return
    const list = workspace.files.filter((f) => prefs.showAllFiles || f.kind !== 'text')
    if (list.length === 0) return
    const current = list.findIndex((f) => f.path === activePath)
    const next = current === -1 ? 0 : (current + delta + list.length) % list.length
    void get().select(list[next].path)
  },

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setPalette: (paletteOpen) => set({ paletteOpen }),
  setSettings: (settingsOpen) => set({ settingsOpen }),
  setShortcuts: (shortcutsOpen) => set({ shortcutsOpen }),
}))

// ---------------------------------------------------------------- helpers

type Setter = (partial: Partial<AppState>) => void
type Getter = () => AppState

function blankDoc() {
  return {
    activePath: null,
    doc: null,
    docStatus: 'idle' as DocStatus,
    docError: null,
    history: [] as string[],
    historyIndex: -1,
  }
}

async function adoptHandle(handle: FileSystemDirectoryHandle, set: Setter, get: Getter) {
  set({ openStatus: 'scanning', scanCount: 0, openError: null })
  try {
    const workspace = await scanDirectoryHandle(handle, {
      includeHidden: get().prefs.includeHidden,
      onProgress: (n) => set({ scanCount: n }),
    })
    await rememberDirectory(handle)
    set({ workspace, openStatus: 'idle', ...blankDoc() })
    set({ recents: await loadRecents() })
    autoSelect(workspace, get)
  } catch (err) {
    set({ openStatus: 'idle', openError: err instanceof Error ? err.message : 'failed' })
  }
}

/** 폴더를 열면 README 같은 시작점을 알아서 띄워 준다. */
function autoSelect(workspace: Workspace, get: Getter) {
  const preferred =
    workspace.files.find((f) => /^readme\.mdx?$/i.test(f.name) && !f.path.includes('/')) ??
    workspace.files.find((f) => /^readme\.mdx?$/i.test(f.name)) ??
    workspace.files.find((f) => f.kind === 'markdown') ??
    workspace.files.find((f) => f.kind !== 'text')
  if (preferred) void get().select(preferred.path)
}

function pushHistory(path: string, set: Setter, get: Getter) {
  const { history, historyIndex } = get()
  if (history[historyIndex] === path) return
  const trimmed = history.slice(0, historyIndex + 1)
  trimmed.push(path)
  set({ history: trimmed.slice(-100), historyIndex: Math.min(trimmed.length, 100) - 1 })
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
