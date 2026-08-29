import { useEffect, useMemo, useRef, useState } from 'react'
import { useT } from '@/shared/i18n/useT'
import { Icon } from '@/shared/ui/Icon'
import {
  applyHighlights,
  clearHighlights,
  collectRanges,
  findSupported,
  scrollRangeIntoView,
} from '../lib/highlight'

interface Props {
  open: boolean
  /** 검색할 영역. 문서가 바뀌면 resetKey 로 초기화한다. */
  container: HTMLElement | null
  resetKey: string | null
  /** 폴더 전체 검색에서 넘어올 때 미리 채워 둘 검색어 */
  seed?: string
  onClose: () => void
}

export function FindBar({ open, container, resetKey, seed, onClose }: Props) {
  const t = useT()
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const [version, setVersion] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const supported = useMemo(findSupported, [])

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.select())
  }, [open])

  // 문서가 바뀌면 검색을 처음으로 되돌린다.
  useEffect(() => {
    setQuery('')
    setIndex(0)
  }, [resetKey])

  // 폴더 전체 검색에서 넘어왔다면 그 검색어로 시작한다.
  useEffect(() => {
    if (seed) {
      setQuery(seed)
      setIndex(0)
    }
  }, [seed, resetKey])

  // 렌더가 끝난 뒤에 훑도록 한 박자 미룬다.
  useEffect(() => {
    const id = setTimeout(() => setVersion((v) => v + 1), 120)
    return () => clearTimeout(id)
  }, [query, container, resetKey])

  const ranges = useMemo(() => {
    if (!open || !container || !query.trim() || !supported) return []
    return collectRanges(container, query.trim())
    // version 은 디바운스 후 다시 훑기 위한 신호다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, container, query, supported, version])

  const safeIndex = ranges.length === 0 ? 0 : Math.min(index, ranges.length - 1)

  useEffect(() => {
    if (!open) {
      clearHighlights()
      return
    }
    applyHighlights(ranges, ranges[safeIndex] ?? null)
    if (ranges[safeIndex]) scrollRangeIntoView(ranges[safeIndex])
  }, [open, ranges, safeIndex])

  useEffect(() => () => clearHighlights(), [])

  if (!open) return null

  function step(delta: number) {
    if (ranges.length === 0) return
    setIndex((current) => (current + delta + ranges.length) % ranges.length)
  }

  return (
    <div className="findbar" role="search">
      <Icon name="search" size={14} />
      <input
        ref={inputRef}
        value={query}
        placeholder={t('find.placeholder')}
        aria-label={t('find.placeholder')}
        spellCheck={false}
        disabled={!supported}
        onChange={(event) => {
          setQuery(event.target.value)
          setIndex(0)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            step(event.shiftKey ? -1 : 1)
          } else if (event.key === 'Escape') {
            onClose()
          }
        }}
      />
      <span className="findbar__count">
        {!supported
          ? t('find.unsupported')
          : ranges.length === 0
            ? query.trim()
              ? t('find.none')
              : ''
            : t('find.count', { i: safeIndex + 1, n: ranges.length })}
      </span>
      <button
        className="iconbtn"
        onClick={() => step(-1)}
        disabled={ranges.length === 0}
        aria-label={t('find.prev')}
      >
        <Icon name="chevronUp" size={14} />
      </button>
      <button
        className="iconbtn"
        onClick={() => step(1)}
        disabled={ranges.length === 0}
        aria-label={t('find.next')}
      >
        <Icon name="chevronDown" size={14} />
      </button>
      <button className="iconbtn" onClick={onClose} aria-label={t('common.close')}>
        <Icon name="close" size={14} />
      </button>
    </div>
  )
}
