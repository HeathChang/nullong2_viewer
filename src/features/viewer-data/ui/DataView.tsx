import { useEffect, useMemo, useState } from 'react'
import type { LoadedDoc } from '@/entities/document'
import { useT } from '@/shared/i18n/useT'
import { usePrefs } from '@/shared/config/prefs'
import { Icon } from '@/shared/ui/Icon'
import { countNodes, parseStructured } from '../lib/parse'
import { branchPaths, findMatches, EXPAND_ALL_LIMIT } from '../lib/search'
import { TreeNode } from './TreeNode'
import { RawBlock } from './RawBlock'

const AUTO_EXPAND_DEPTH = 2

export function DataView({ doc, initialQuery }: { doc: LoadedDoc; initialQuery?: string }) {
  const t = useT()
  const wrapCode = usePrefs((s) => s.wrapCode)
  const parsed = useMemo(() => parseStructured(doc.text, doc.kind), [doc.text, doc.kind])
  const [mode, setMode] = useState<'tree' | 'raw'>('tree')
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 140)
    return () => clearTimeout(id)
  }, [query])

  useEffect(() => {
    setQuery('')
    setDebounced('')
    setMode('tree')
  }, [doc.path])

  useEffect(() => {
    setExpanded(parsed.ok ? branchPaths(parsed.value, AUTO_EXPAND_DEPTH) : new Set())
  }, [parsed])

  // 폴더 전체 검색에서 넘어왔다면 그 검색어로 시작한다.
  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery)
      setDebounced(initialQuery)
    }
  }, [initialQuery, doc.path])

  const matches = useMemo(
    () => (debounced && parsed.ok ? findMatches(parsed.value, debounced) : null),
    [debounced, parsed],
  )
  const nodeCount = useMemo(() => (parsed.ok ? countNodes(parsed.value) : 0), [parsed])

  if (!parsed.ok) {
    return (
      <article className="reader data">
        <div className="data__error">
          <h2>{t('data.parseError')}</h2>
          {parsed.line !== undefined && <p>{t('data.parseErrorAt', { line: parsed.line })}</p>}
          <pre>{parsed.message}</pre>
        </div>
        <RawBlock doc={doc} wrap={wrapCode} />
      </article>
    )
  }

  const value = parsed.value

  return (
    <article className="reader data">
      <div className="data__bar">
        <div className="segmented segmented--sm">
          <button className={mode === 'tree' ? 'is-on' : ''} onClick={() => setMode('tree')}>
            {t('data.tree')}
          </button>
          <button className={mode === 'raw' ? 'is-on' : ''} onClick={() => setMode('raw')}>
            {t('data.raw')}
          </button>
        </div>

        {mode === 'tree' && (
          <>
            <div className="data__search">
              <Icon name="search" size={13} />
              <input
                value={query}
                placeholder={t('data.search')}
                spellCheck={false}
                aria-label={t('data.search')}
                onChange={(event) => setQuery(event.target.value)}
              />
              {query && (
                <button className="iconbtn" onClick={() => setQuery('')} aria-label={t('common.close')}>
                  <Icon name="close" size={12} />
                </button>
              )}
            </div>
            {matches && (
              <span className="data__count">
                {matches.count > 0 ? t('data.matches', { n: matches.count }) : t('data.noMatches')}
              </span>
            )}
            <div className="data__tools">
              <button
                className="linkbtn"
                onClick={() => setExpanded(branchPaths(value, Number.POSITIVE_INFINITY))}
                disabled={nodeCount > EXPAND_ALL_LIMIT}
              >
                {t('data.expandAll')}
              </button>
              <button className="linkbtn" onClick={() => setExpanded(new Set())}>
                {t('data.collapseAll')}
              </button>
            </div>
          </>
        )}
      </div>

      {parsed.lenient && <p className="data__note">{t('data.lenientNote')}</p>}
      {parsed.records !== undefined && (
        <p className="data__note">
          {t('data.records', { n: parsed.records })}
          {parsed.badLines && parsed.badLines.length > 0
            ? ` · ${t('data.badLines', { n: parsed.badLines.length })}`
            : ''}
        </p>
      )}

      {mode === 'raw' ? (
        <RawBlock doc={doc} wrap={wrapCode} />
      ) : (
        <div className="tree-data">
          <TreeNode
            nodeKey={doc.name}
            value={value}
            path="$"
            depth={0}
            expanded={matches ? matches.keep : expanded}
            toggle={(path) =>
              setExpanded((prev) => {
                const next = new Set(matches ? matches.keep : prev)
                if (next.has(path)) next.delete(path)
                else next.add(path)
                return next
              })
            }
            query={debounced}
            filter={matches?.keep ?? null}
            root
          />
        </div>
      )}
    </article>
  )
}
