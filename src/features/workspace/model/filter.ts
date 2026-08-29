import type { DirNode, FileKind, FileNode, Workspace } from '@/entities/document'
import { KIND_ORDER } from '@/entities/document'

export interface FileFilter {
  /** 켜져 있는 형식들 */
  kinds: FileKind[]
  includeHidden: boolean
}

export function defaultFilter(): FileFilter {
  // 형식은 전부 켠 채로 시작한다. 못 여는 파일이라도 있다는 사실은 보여야 한다.
  // 숨김 파일만 꺼 두고, 칩에 개수를 띄워 존재는 알린다.
  return { kinds: [...KIND_ORDER], includeHidden: false }
}

const KEY = (folder: string) => `nullong:filter:${folder}`

/** 폴더마다 마지막으로 고른 형식을 기억한다. */
export function loadFilter(folder: string): FileFilter {
  try {
    const raw = localStorage.getItem(KEY(folder))
    if (!raw) return defaultFilter()
    const saved = JSON.parse(raw) as Partial<FileFilter>
    return {
      kinds: Array.isArray(saved.kinds) ? saved.kinds.filter(isKind) : defaultFilter().kinds,
      includeHidden: Boolean(saved.includeHidden),
    }
  } catch {
    return defaultFilter()
  }
}

export function saveFilter(folder: string, filter: FileFilter): void {
  try {
    localStorage.setItem(KEY(folder), JSON.stringify(filter))
  } catch {
    /* 저장 실패는 치명적이지 않다 */
  }
}

function isKind(value: unknown): value is FileKind {
  return typeof value === 'string' && (KIND_ORDER as string[]).includes(value)
}

export function matches(node: FileNode, filter: FileFilter): boolean {
  if (node.hidden && !filter.includeHidden) return false
  return filter.kinds.includes(node.kind)
}

export function visibleFiles(workspace: Workspace | null, filter: FileFilter): FileNode[] {
  if (!workspace) return []
  return workspace.files.filter((node) => matches(node, filter))
}

/** 폴더에 실제로 있는 형식만 개수와 함께. 칩 줄이 곧 폴더 요약이 된다. */
export function countByKind(workspace: Workspace | null, includeHidden: boolean): Map<FileKind, number> {
  const counts = new Map<FileKind, number>()
  if (!workspace) return counts
  for (const node of workspace.files) {
    if (node.hidden && !includeHidden) continue
    counts.set(node.kind, (counts.get(node.kind) ?? 0) + 1)
  }
  return counts
}

export function hiddenCount(workspace: Workspace | null, filter: FileFilter): number {
  if (!workspace) return 0
  return workspace.files.filter((node) => !matches(node, filter)).length
}

/** 필터를 통과한 파일만 남기고, 그 결과 비어 버린 디렉토리는 접어 없앤다. */
export function pruneTree(dir: DirNode, filter: FileFilter): DirNode | null {
  const files = dir.files.filter((node) => matches(node, filter))
  const dirs = dir.dirs
    .map((child) => pruneTree(child, filter))
    .filter((child): child is DirNode => child !== null)
  if (files.length === 0 && dirs.length === 0) return null
  return { ...dir, files, dirs }
}
