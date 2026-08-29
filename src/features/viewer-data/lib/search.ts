import { childEntries, isBranch, joinPath } from './parse'

export const EXPAND_ALL_LIMIT = 20_000

/** 깊이 n 까지의 분기 경로를 모아 초기 펼침 상태를 만든다. */
export function branchPaths(root: unknown, maxDepth: number, limit = EXPAND_ALL_LIMIT): Set<string> {
  const out = new Set<string>()
  const stack: { value: unknown; path: string; depth: number }[] = [
    { value: root, path: '$', depth: 0 },
  ]
  while (stack.length && out.size < limit) {
    const { value, path, depth } = stack.pop()!
    if (!isBranch(value)) continue
    out.add(path)
    if (depth >= maxDepth) continue
    const inArray = Array.isArray(value)
    for (const [key, child] of childEntries(value)) {
      stack.push({ value: child, path: joinPath(path, key, inArray), depth: depth + 1 })
    }
  }
  return out
}

export interface MatchIndex {
  /** 일치한 노드와 그 조상들의 경로 */
  keep: Set<string>
  count: number
}

/** 일치 항목만 남기고 조상을 자동으로 펼치기 위한 경로 집합을 만든다. */
export function findMatches(root: unknown, query: string): MatchIndex {
  const keep = new Set<string>()
  const needle = query.toLowerCase()
  let count = 0

  function walk(value: unknown, path: string, key: string): boolean {
    const keyHit = key.toLowerCase().includes(needle)
    if (!isBranch(value)) {
      if (keyHit || String(value).toLowerCase().includes(needle)) {
        keep.add(path)
        count++
        return true
      }
      return false
    }
    let childHit = false
    const inArray = Array.isArray(value)
    for (const [childKey, child] of childEntries(value)) {
      if (walk(child, joinPath(path, childKey, inArray), childKey)) childHit = true
    }
    if (keyHit || childHit) {
      keep.add(path)
      if (keyHit) count++
      return true
    }
    return false
  }

  walk(root, '$', '')
  return { keep, count }
}
