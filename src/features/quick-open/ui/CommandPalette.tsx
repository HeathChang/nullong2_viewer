import { useEffect, useMemo, useRef, useState } from 'react'
import type { FileKind, FileNode } from '@/entities/document'
import { isOpenable } from '@/entities/document'
import { useT } from '@/shared/i18n/useT'
import { Icon, type IconName } from '@/shared/ui/Icon'
import { score } from '../lib/score'

function iconFor(kind: FileKind): IconName {
  if (kind === 'json' || kind === 'jsonl' || kind === 'yaml') return 'braces'
  if (kind === 'other') return 'blank'
  return 'doc'
}

interface Props {
  open: boolean
  /** 사이드바와 같은 필터를 통과한 목록. 트리에 없는 파일이 여기서 튀어나오면 안 된다. */
  files: FileNode[]
  onPick: (path: string) => void
  onClose: () => void
}

export function CommandPalette({ open, files, onPick, onClose }: Props) {
  const t = useT()
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setCursor(0)
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [open])

  const results = useMemo(() => {
    const needle = query.trim()
    if (!needle) return files.slice(0, 60)
    return files
      .map((file) => ({ file, s: score(file.path, needle) }))
      .filter((entry) => entry.s >= 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 60)
      .map((entry) => entry.file)
  }, [files, query])

  useEffect(() => setCursor(0), [query])
  useEffect(() => {
    listRef.current?.children[cursor]?.scrollIntoView({ block: 'nearest' })
  }, [cursor])

  if (!open) return null

  return (
    <div className="overlay" onMouseDown={onClose}>
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
                if (target) onPick(target.path)
              } else if (event.key === 'Escape') {
                onClose()
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
                  className={`palette__item${index === cursor ? ' is-active' : ''}${
                    isOpenable(file.kind) ? '' : ' is-muted'
                  }`}
                  onMouseEnter={() => setCursor(index)}
                  onClick={() => onPick(file.path)}
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
