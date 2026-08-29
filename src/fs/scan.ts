import type { DirNode, FileNode, Workspace } from '../types'
import { kindOf } from './kinds'

/** 읽을 이유가 거의 없고 파일 수만 폭증시키는 디렉토리 */
export const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  '.svn',
  '.hg',
  'dist',
  'build',
  'out',
  '.next',
  '.nuxt',
  '.svelte-kit',
  '.turbo',
  '.cache',
  '.parcel-cache',
  'coverage',
  '.nyc_output',
  'vendor',
  'target',
  '.venv',
  'venv',
  '__pycache__',
  '.mypy_cache',
  '.pytest_cache',
  '.gradle',
  '.idea',
  'Pods',
  '.terraform',
])

export const MAX_FILES = 20_000
export const MAX_DEPTH = 16

export interface ScanOptions {
  includeHidden: boolean
  onProgress?: (count: number) => void
}

function emptyDir(path: string, name: string): DirNode {
  return { path, name, dirs: [], files: [] }
}

function sortDir(dir: DirNode): void {
  const byName = (a: { name: string }, b: { name: string }) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
  dir.dirs.sort(byName)
  dir.files.sort(byName)
  dir.dirs.forEach(sortDir)
}

/** 내용이 하나도 없는 디렉토리는 트리에서 제거해 사이드바를 깨끗하게 유지한다. */
function prune(dir: DirNode): boolean {
  dir.dirs = dir.dirs.filter(prune)
  return dir.files.length > 0 || dir.dirs.length > 0
}

// ---------------------------------------------------------------- File System Access API

export async function scanDirectoryHandle(
  handle: FileSystemDirectoryHandle,
  opts: ScanOptions,
): Promise<Workspace> {
  const root = emptyDir('', handle.name)
  const files: FileNode[] = []
  let truncated = false

  async function walk(dirHandle: FileSystemDirectoryHandle, node: DirNode, depth: number) {
    if (depth > MAX_DEPTH || truncated) return
    for await (const entry of dirHandle.values()) {
      if (truncated) return
      if (!opts.includeHidden && entry.name.startsWith('.')) continue
      const path = node.path ? `${node.path}/${entry.name}` : entry.name

      if (entry.kind === 'directory') {
        if (IGNORED_DIRS.has(entry.name)) continue
        const child = emptyDir(path, entry.name)
        node.dirs.push(child)
        await walk(entry as FileSystemDirectoryHandle, child, depth + 1)
        continue
      }

      const kind = kindOf(entry.name)
      if (!kind) continue
      if (files.length >= MAX_FILES) {
        truncated = true
        return
      }
      const node1: FileNode = {
        path,
        name: entry.name,
        kind,
        size: 0,
        lastModified: 0,
        handle: entry as FileSystemFileHandle,
      }
      node.files.push(node1)
      files.push(node1)
      if (files.length % 200 === 0) opts.onProgress?.(files.length)
    }
  }

  await walk(handle, root, 0)
  prune(root)
  sortDir(root)
  opts.onProgress?.(files.length)
  return { name: handle.name, mode: 'fsaccess', root, files, truncated, handle }
}

// ---------------------------------------------------------------- 폴백: File[] 스냅샷

/** `<input webkitdirectory>` 나 드래그앤드롭으로 받은 File 목록을 트리로 만든다. */
export function buildSnapshotWorkspace(entries: { file: File; path: string }[]): Workspace {
  let rootName = ''
  const first = entries[0]?.path ?? ''
  const slash = first.indexOf('/')
  if (slash > 0) rootName = first.slice(0, slash)

  const root = emptyDir('', rootName || 'files')
  const files: FileNode[] = []
  const dirIndex = new Map<string, DirNode>([['', root]])

  function ensureDir(path: string): DirNode {
    const found = dirIndex.get(path)
    if (found) return found
    const idx = path.lastIndexOf('/')
    const parent = ensureDir(idx === -1 ? '' : path.slice(0, idx))
    const dir = emptyDir(path, path.slice(idx + 1))
    parent.dirs.push(dir)
    dirIndex.set(path, dir)
    return dir
  }

  let truncated = false
  for (const { file, path: full } of entries) {
    // 루트 폴더명은 경로에서 떼어낸다.
    const rel = rootName && full.startsWith(rootName + '/') ? full.slice(rootName.length + 1) : full
    const kind = kindOf(file.name)
    if (!kind) continue
    if (files.length >= MAX_FILES) {
      truncated = true
      break
    }
    const idx = rel.lastIndexOf('/')
    const dir = ensureDir(idx === -1 ? '' : rel.slice(0, idx))
    const node: FileNode = {
      path: rel,
      name: file.name,
      kind,
      size: file.size,
      lastModified: file.lastModified,
      file,
    }
    dir.files.push(node)
    files.push(node)
  }

  prune(root)
  sortDir(root)
  return { name: root.name, mode: 'snapshot', root, files, truncated }
}

/** 드래그앤드롭된 DataTransferItem 들을 재귀적으로 펼친다. */
export async function readDataTransfer(items: DataTransferItemList): Promise<{ file: File; path: string }[]> {
  const roots: FileSystemEntry[] = []
  for (const item of Array.from(items)) {
    const entry = item.webkitGetAsEntry?.()
    if (entry) roots.push(entry)
  }

  const out: { file: File; path: string }[] = []

  async function walk(entry: FileSystemEntry, depth: number): Promise<void> {
    if (depth > MAX_DEPTH || out.length >= MAX_FILES) return
    if (entry.isFile) {
      const file = await new Promise<File | null>((resolve) =>
        (entry as FileSystemFileEntry).file(resolve, () => resolve(null)),
      )
      if (file) out.push({ file, path: entry.fullPath.replace(/^\//, '') })
      return
    }
    if (!entry.isDirectory) return
    if (IGNORED_DIRS.has(entry.name)) return

    const reader = (entry as FileSystemDirectoryEntry).createReader()
    // readEntries 는 한 번에 최대 100개만 준다. 빌 때까지 반복해야 한다.
    for (;;) {
      const batch = await new Promise<FileSystemEntry[]>((resolve) =>
        reader.readEntries(resolve, () => resolve([])),
      )
      if (batch.length === 0) break
      for (const child of batch) await walk(child, depth + 1)
    }
  }

  for (const entry of roots) await walk(entry, 0)
  return out
}
