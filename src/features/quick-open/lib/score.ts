/** 경로 조각을 순서대로 만나면 통과하는 느슨한 부분일치. 낮으면 탈락. */
export function score(path: string, query: string): number {
  const target = path.toLowerCase()
  const needle = query.toLowerCase()
  const direct = target.indexOf(needle)
  if (direct !== -1) return 2000 - direct
  let index = 0
  let total = 0
  for (const ch of needle) {
    const found = target.indexOf(ch, index)
    if (found === -1) return -1
    total += found === index ? 3 : 1
    index = found + 1
  }
  return total
}
