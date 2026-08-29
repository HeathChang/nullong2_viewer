/** `docs/a.md` 에서 `../b.md` 같은 상대 경로를 워크스페이스 경로로 되돌린다. */
export function resolveRelative(from: string, rel: string): string {
  const base = from.split('/').slice(0, -1)
  const clean = rel.split('#')[0].split('?')[0]
  for (const part of clean.split('/')) {
    if (!part || part === '.') continue
    if (part === '..') base.pop()
    else base.push(part)
  }
  return base.join('/')
}
