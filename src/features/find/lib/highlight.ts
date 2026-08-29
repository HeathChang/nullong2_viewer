const ALL = 'nl-find'
const CURRENT = 'nl-find-current'

/**
 * CSS Custom Highlight API 를 쓴다. DOM 을 건드리지 않고 강조하므로
 * 마크다운 렌더 결과나 코드 하이라이트를 망가뜨리지 않는다.
 */
export function findSupported(): boolean {
  return typeof CSS !== 'undefined' && 'highlights' in CSS && typeof Highlight !== 'undefined'
}

const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT'])

export function collectRanges(root: HTMLElement, query: string): Range[] {
  const needle = query.toLowerCase()
  if (!needle) return []

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement
      if (!parent || SKIP.has(parent.tagName)) return NodeFilter.FILTER_REJECT
      // 복사 버튼처럼 나중에 심은 UI 요소는 본문이 아니다.
      if (parent.closest('.code-copy')) return NodeFilter.FILTER_REJECT
      return node.nodeValue?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
    },
  })

  const ranges: Range[] = []
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.nodeValue!.toLowerCase()
    let from = text.indexOf(needle)
    while (from !== -1) {
      const range = document.createRange()
      range.setStart(node, from)
      range.setEnd(node, from + needle.length)
      ranges.push(range)
      from = text.indexOf(needle, from + needle.length)
      if (ranges.length > 5000) return ranges
    }
  }
  return ranges
}

export function applyHighlights(all: Range[], current: Range | null): void {
  if (!findSupported()) return
  CSS.highlights.set(ALL, new Highlight(...all))
  CSS.highlights.set(CURRENT, current ? new Highlight(current) : new Highlight())
}

export function clearHighlights(): void {
  if (!findSupported()) return
  CSS.highlights.delete(ALL)
  CSS.highlights.delete(CURRENT)
}

export function scrollRangeIntoView(range: Range): void {
  const target =
    range.startContainer.nodeType === Node.ELEMENT_NODE
      ? (range.startContainer as HTMLElement)
      : range.startContainer.parentElement
  target?.scrollIntoView({ block: 'center', behavior: 'smooth' })
}
