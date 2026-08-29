import { useState } from 'react'
import { useT } from '@/shared/i18n/useT'
import { Icon } from '@/shared/ui/Icon'
import { childEntries, isBranch, joinPath, previewOf, typeOf, type ValueType } from '../lib/parse'

const CHUNK = 100

export interface TreeNodeProps {
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

export function TreeNode(props: TreeNodeProps) {
  const { nodeKey, value, path, depth, expanded, toggle, query, filter, root } = props
  const t = useT()
  const [shown, setShown] = useState(CHUNK)
  const [copied, setCopied] = useState<'value' | 'path' | null>(null)

  const branch = isBranch(value)
  const open = expanded.has(path)
  const inArray = Array.isArray(value)

  const entries = branch ? childEntries(value) : []
  const visible = filter
    ? entries.filter(([key]) => filter.has(joinPath(path, key, inArray)))
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
      <div className={`node__row${branch ? ' is-branch' : ''}`} style={{ paddingLeft: 6 + depth * 14 }}>
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
          <Leaf value={value} type={typeOf(value)} query={query} />
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
          {slice.length === 0 && (
            <p className="node__empty" style={{ paddingLeft: 20 + depth * 14 }}>
              {t('data.empty')}
            </p>
          )}
          {slice.map(([key, child]) => (
            <TreeNode
              key={key}
              nodeKey={key}
              value={child}
              path={joinPath(path, key, inArray)}
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
