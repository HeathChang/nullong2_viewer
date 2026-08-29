import { useEffect, useMemo, useState } from 'react'
import hljs from './highlight'
import type { LoadedDoc } from '../types'
import { useT } from '../i18n/useT'
import { useApp } from '../state/store'
import { Icon } from '../components/Icon'
import {
  childEntries,
  countNodes,
  isBranch,
  joinPath,
  parseStructured,
  previewOf,
  typeOf,
  type ValueType,
} from './structured'

const CHUNK = 100
const AUTO_EXPAND_DEPTH = 2
const EXPAND_ALL_LIMIT = 20_000

/** 깊이 n 까지의 분기 경로를 모아 초기 펼침 상태를 만든다. */
function branchPaths(root: unknown, maxDepth: number, limit = EXPAND_ALL_LIMIT): Set<string> {
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

interface MatchIndex {
  keep: Set<string>
  count: number
}

function findMatches(root: unknown, query: string): MatchIndex {
  const keep = new Set<string>()
  let count = 0
  const needle = query.toLowerCase()

  function walk(value: unknown, path: string, key: string): boolean {
    const keyHit = key.toLowerCase().includes(needle)
    if (!isBranch(value)) {
      const valueHit = String(value).toLowerCase().includes(needle)
      if (keyHit || valueHit) {
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

export function DataView({ doc }: { doc: LoadedDoc }) {
  const t = useT()
  const wrapCode = useApp((s) => s.prefs.wrapCode)
  const parsed = useMemo(() => parseStructured(doc.text, doc.kind), [doc.text, doc.kind])
  const [mode, setMode] = useState<'tree' | 'raw'>('tree')
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 140)
    return () => clearTimeout(id)
  }, [query])

  useEffect(() => {
    setQuery('')
    setDebounced('')
    setMode('tree')
  }, [doc.path])

  const value = parsed.ok ? parsed.value : null
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    setExpanded(parsed.ok ? branchPaths(parsed.value, AUTO_EXPAND_DEPTH) : new Set())
  }, [parsed])

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

  const effectiveExpanded = matches ? matches.keep : expanded

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
            expanded={effectiveExpanded}
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

interface TreeNodeProps {
  nodeKey: string
  value: unknown
  path: string
  depth: number
  expanded: Set<string>
  toggle: (path: string) => void
  query: string
  filter: Set<string> | null
  root?: boolean
}

function TreeNode(props: TreeNodeProps) {
  const { nodeKey, value, path, depth, expanded, toggle, query, filter, root } = props
  const t = useT()
  const [shown, setShown] = useState(CHUNK)
  const [copied, setCopied] = useState<'value' | 'path' | null>(null)

  const branch = isBranch(value)
  const open = expanded.has(path)
  const type = typeOf(value)

  const entries = branch ? childEntries(value) : []
  const visible = filter
    ? entries.filter(([key]) => filter.has(joinPath(path, key, Array.isArray(value))))
    : entries
  const slice = visible.slice(0, shown)

  function copy(kind: 'value' | 'path') {
    const text =
      kind === 'path' ? path : branch ? JSON.stringify(value, null, 2) : String(value ?? 'null')
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(kind)
      setTimeout(() => setCopied(null), 1200)
    })
  }

  return (
    <div className="node">
      <div
        className={`node__row${branch ? ' is-branch' : ''}`}
        style={{ paddingLeft: 6 + depth * 14 }}
      >
        {branch ? (
          <button
            className={`node__chevron${open ? ' is-open' : ''}`}
            onClick={() => toggle(path)}
            aria-expanded={open}
            aria-label={nodeKey}
          >
            <Icon name="chevron" size={12} />
          </button>
        ) : (
          <span className="node__chevron node__chevron--empty" />
        )}

        <span className={`node__key${root ? ' node__key--root' : ''}`}>
          <Mark text={nodeKey} query={query} />
        </span>

        {branch ? (
          <span className="node__preview">
            {previewOf(value)}
            {!open && entries.length > 0 && <span className="node__hint">…</span>}
          </span>
        ) : (
          <Leaf value={value} type={type} query={query} />
        )}

        <span className="node__actions">
          <button className="iconbtn" title={t('data.copyPath')} onClick={() => copy('path')}>
            <Icon name={copied === 'path' ? 'check' : 'copy'} size={12} />
          </button>
          <button className="iconbtn" title={t('data.copyValue')} onClick={() => copy('value')}>
            <Icon name={copied === 'value' ? 'check' : 'braces'} size={12} />
          </button>
        </span>
      </div>

      {branch && open && (
        <div className="node__children">
          {slice.length === 0 && <p className="node__empty" style={{ paddingLeft: 20 + depth * 14 }}>{t('data.empty')}</p>}
          {slice.map(([key, child]) => (
            <TreeNode
              key={key}
              nodeKey={key}
              value={child}
              path={joinPath(path, key, Array.isArray(value))}
              depth={depth + 1}
              expanded={expanded}
              toggle={toggle}
              query={query}
              filter={filter}
            />
          ))}
          {visible.length > shown && (
            <button
              className="node__more"
              style={{ marginLeft: 20 + depth * 14 }}
              onClick={() => setShown((n) => n + CHUNK * 5)}
            >
              {t('data.showMore', { n: visible.length - shown })}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function Leaf({ value, type, query }: { value: unknown; type: ValueType; query: string }) {
  const text = type === 'null' ? 'null' : String(value)
  return (
    <span className={`leaf leaf--${type}`}>
      {type === 'string' ? (
        <>
          <span className="leaf__quote">"</span>
          <Mark text={text} query={query} />
          <span className="leaf__quote">"</span>
        </>
      ) : (
        <Mark text={text} query={query} />
      )}
    </span>
  )
}

/** 검색어와 일치하는 부분만 강조한다. */
function Mark({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>
  const index = text.toLowerCase().indexOf(query.toLowerCase())
  if (index === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, index)}
      <mark>{text.slice(index, index + query.length)}</mark>
      {text.slice(index + query.length)}
    </>
  )
}

function RawBlock({ doc, wrap }: { doc: LoadedDoc; wrap: boolean }) {
  const language = doc.kind === 'yaml' ? 'yaml' : 'json'
  const html = useMemo(() => {
    try {
      return hljs.highlight(doc.text, { language, ignoreIllegals: true }).value
    } catch {
      return doc.text.replace(/[&<>]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[ch]!)
    }
  }, [doc.text, language])

  return (
    <pre className={`raw${wrap ? ' wrap-code' : ''}`}>
      <code className="hljs" dangerouslySetInnerHTML={{ __html: html }} />
    </pre>
  )
}
