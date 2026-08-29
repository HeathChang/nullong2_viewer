import { useEffect, useMemo, useRef, useState } from 'react'
import type { FileNode } from '@/entities/document'
import { useT } from '@/shared/i18n/useT'
import { Icon } from '@/shared/ui/Icon'
import { useFolderSearch } from '../model/useFolderSearch'
import { MIN_QUERY, type SearchHit } from '../model/types'

interface Props {
  open: boolean
  /** 사이드바와 같은 필터를 통과한 목록만 훑는다. */
  files: FileNode[]
  onOpen: (path: string, query: string) => void
  onClose: () => void
}

interface Group {
  path: string
  hits: SearchHit[]
}

export function SearchPanel({ open, files, onOpen, onClose }: Props) {
  const t = useT()
  const { query, run, reset, result } = useFolderSearch(files)
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.select())
    else reset()
  }, [open, reset])

  const groups = useMemo<Group[]>(() => {
    const byPath = new Map<string, SearchHit[]>()
    for (const hit of result.hits) {
      const list = byPath.get(hit.path)
      if (list) list.push(hit)
      else byPath.set(hit.path, [hit])
    }
    return [...byPath.entries()].map(([path, hits]) => ({ path, hits }))
  }, [result.hits])

  const flat = useMemo(() => groups.flatMap((group) => group.hits), [groups])
  const safeCursor = flat.length === 0 ? 0 : Math.min(cursor, flat.length - 1)

  useEffect(() => setCursor(0), [query])
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [safeCursor, flat.length])

  if (!open) return null

  const tooShort = query.trim().length > 0 && query.trim().length < MIN_QUERY
  const searching = !result.done && result.total > 0

  function pick(hit: SearchHit | undefined) {
    if (hit) onOpen(hit.path, query.trim())
  }

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div
        className="palette palette--wide"
        role="dialog"
        aria-modal="true"
        aria-label={t('searchAll.title')}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="palette__input">
          <Icon name="findText" />
          <input
            ref={inputRef}
            value={query}
            placeholder={t('searchAll.placeholder')}
            spellCheck={false}
            aria-controls="searchall-results"
            onChange={(event) => run(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault()
                setCursor((c) => Math.min(c + 1, flat.length - 1))
              } else if (event.key === 'ArrowUp') {
                event.preventDefault()
                setCursor((c) => Math.max(c - 1, 0))
              } else if (event.key === 'Enter') {
                event.preventDefault()
                pick(flat[safeCursor])
              } else if (event.key === 'Escape') {
                onClose()
              }
            }}
          />
          {searching && <span className="palette__spinner" aria-hidden="true" />}
        </div>

        <p className="searchall__status" role="status">
          {tooShort
            ? t('searchAll.tooShort', { n: MIN_QUERY })
            : searching
              ? t('searchAll.scanning', { scanned: result.scanned, total: result.total })
              : flat.length > 0
                ? t('searchAll.summary', { files: result.files, hits: flat.length })
                : query.trim().length >= MIN_QUERY
                  ? t('searchAll.none')
                  : ''}
          {result.truncated && ` · ${t('searchAll.truncated', { n: flat.length })}`}
          {result.done && result.skipped > 0 && ` · ${t('searchAll.skipped', { n: result.skipped })}`}
        </p>

        <div className="searchall__list" id="searchall-results" ref={listRef}>
          {groups.map((group) => (
            <section key={group.path} className="searchall__group">
              <h3 className="searchall__file">
                <Icon name="doc" size={13} />
                <span className="searchall__name">{group.path.split('/').pop()}</span>
                <span className="searchall__path">{group.path}</span>
                <span className="searchall__n">{group.hits.length}</span>
              </h3>
              {group.hits.map((hit) => {
                const index = flat.indexOf(hit)
                const active = index === safeCursor
                return (
                  <button
                    key={`${hit.path}:${hit.line}:${hit.col}`}
                    className={`searchall__hit${active ? ' is-active' : ''}`}
                    data-active={active}
                    onMouseEnter={() => setCursor(index)}
                    onClick={() => pick(hit)}
                  >
                    <span className="searchall__line" aria-label={t('searchAll.line', { n: hit.line })}>
                      {hit.line}
                    </span>
                    <span className="searchall__text">
                      {hit.text.slice(0, hit.col)}
                      <mark>{hit.text.slice(hit.col, hit.col + hit.length)}</mark>
                      {hit.text.slice(hit.col + hit.length)}
                    </span>
                  </button>
                )
              })}
            </section>
          ))}
        </div>

        <p className="palette__hint">{t('searchAll.hint')}</p>
      </div>
    </div>
  )
}
