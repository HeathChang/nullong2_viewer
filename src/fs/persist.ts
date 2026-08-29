import { del, get, set } from 'idb-keyval'

/**
 * 디렉토리 핸들은 IndexedDB 에 저장할 수 있다(구조화 복제 가능).
 * 덕분에 새로고침/재방문 후에도 "다시 열기" 한 번이면 같은 폴더로 돌아온다.
 */
export interface RecentEntry {
  id: string
  name: string
  openedAt: number
  handle: FileSystemDirectoryHandle
}

const KEY = 'zzaim:recent-dirs'
const LIMIT = 8

export async function loadRecents(): Promise<RecentEntry[]> {
  try {
    const list = (await get<RecentEntry[]>(KEY)) ?? []
    return list.sort((a, b) => b.openedAt - a.openedAt)
  } catch {
    return []
  }
}

export async function rememberDirectory(handle: FileSystemDirectoryHandle): Promise<void> {
  try {
    const list = await loadRecents()
    const kept: RecentEntry[] = []
    for (const entry of list) {
      // 같은 폴더면 갱신만 한다.
      const same = await entry.handle.isSameEntry?.(handle).catch(() => false)
      if (!same) kept.push(entry)
    }
    kept.unshift({ id: crypto.randomUUID(), name: handle.name, openedAt: Date.now(), handle })
    await set(KEY, kept.slice(0, LIMIT))
  } catch {
    /* 저장 실패는 치명적이지 않다 */
  }
}

export async function forgetDirectory(id: string): Promise<void> {
  const list = await loadRecents()
  await set(KEY, list.filter((e) => e.id !== id))
}

export async function clearRecents(): Promise<void> {
  await del(KEY)
}

/**
 * 저장된 핸들은 권한이 만료될 수 있다. 사용자 제스처 안에서 다시 요청한다.
 * 편집·저장을 지원하므로 readwrite 로 받아 두지만, 실제 쓰기는 명시적 저장에서만 일어난다.
 */
export async function ensurePermission(
  handle: FileSystemHandle,
  mode: 'read' | 'readwrite' = 'readwrite',
): Promise<boolean> {
  const opts = { mode }
  if ((await handle.queryPermission?.(opts)) === 'granted') return true
  return (await handle.requestPermission?.(opts)) === 'granted'
}
