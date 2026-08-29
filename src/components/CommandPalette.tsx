import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../state/store'
import { useT } from '../i18n/useT'
import { Icon, type IconName } from './Icon'
import type { FileKind } from '../types'

function iconFor(kind: FileKind): IconName {
  return kind === 'json' || kind === 'jsonl' || kind === 'yaml' ? 'braces' : 'doc'
}

function score(path: string, query: string): number {
  const target = path.toLowerCase()
  const q = query.toLowerCase()
  const direct = target.indexOf(q)
  if (direct !== -1) return 2000 - direct
  let index = 0
  let total = 0
  for (const ch of q) {
    const found = target.indexOf(ch, index)
    if (found === -1) return -1
    total += found === index ? 3 : 1
    index = found + 1
  }
  return total
}

export function CommandPalette() {
  const t = useT()
  const open = useApp((s) => s.paletteOpen)
  const setPalette = useApp((s) => s.setPalette)
  const workspace = useApp((s) => s.workspace)
  const select = useApp((s) => s.select)
  const showAllFiles = useApp((s) => s.prefs.showAllFiles)

  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setCursor(0)
      // 다이얼로그가 그려진 뒤 포커스를 준다.
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  const results = useMemo(() => {
    if (!workspace) return []
    const pool = workspace.files.filter((f) => showAllFiles || f.kind !== 'text')
    if (!query.trim()) return pool.slice(0, 60)
    return pool
      .map((file) => ({ file, s: score(file.path, query.trim()) }))
      .filter((entry) => entry.s >= 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 60)
      .map((entry) => entry.file)
  }, [workspace, query, showAllFiles])

  useEffect(() => setCursor(0), [query])

  useEffect(() => {
    listRef.current?.children[cursor]?.scrollIntoView({ block: 'nearest' })
  }, [cursor])

  if (!open) return null

  return (
    <div className="overlay" onMouseDown={() => setPalette(false)}>
      <div
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-label={t('toolbar.search')}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="palette__input">
          <Icon name="search" />
          <input
            ref={inputRef}
            value={query}
            placeholder={t('palette.placeholder')}
            spellCheck={false}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault()
                setCursor((c) => Math.min(c + 1, results.length - 1))
              } else if (event.key === 'ArrowUp') {
                event.preventDefault()
                setCursor((c) => Math.max(c - 1, 0))
              } else if (event.key === 'Enter') {
                event.preventDefault()
                const target = results[cursor]
                if (target) void select(target.path)
              } else if (event.key === 'Escape') {
                setPalette(false)
              }
            }}
          />
        </div>

        {results.length === 0 ? (
          <p className="palette__empty">{t('palette.empty')}</p>
        ) : (
          <ul className="palette__list" ref={listRef}>
            {results.map((file, index) => (
              <li key={file.path}>
                <button
                  className={`palette__item${index === cursor ? ' is-active' : ''}`}
                  onMouseEnter={() => setCursor(index)}
                  onClick={() => void select(file.path)}
                >
                  <Icon name={iconFor(file.kind)} size={14} />
                  <span className="palette__name">{file.name}</span>
                  <span className="palette__path">{file.path}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className="palette__hint">{t('palette.hint')}</p>
      </div>
    </div>
  )
}
