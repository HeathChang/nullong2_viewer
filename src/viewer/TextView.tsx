import { useMemo, useState } from 'react'
import type { LoadedDoc } from '../types'
import { useApp } from '../state/store'

const CHUNK = 5000

export function TextView({ doc }: { doc: LoadedDoc }) {
  const wrapCode = useApp((s) => s.prefs.wrapCode)
  const lines = useMemo(() => doc.text.split(/\r?\n/), [doc.text])
  const [limit, setLimit] = useState(CHUNK)
  const shown = lines.slice(0, limit)

  return (
    <article className={`reader plain${wrapCode ? ' wrap-code' : ''}`}>
      <div className="plain__grid">
        <div className="plain__gutter" aria-hidden="true">
          {shown.map((_, index) => (
            <span key={index}>{index + 1}</span>
          ))}
        </div>
        <pre className="plain__body">
          {shown.map((line, index) => (
            <span className="plain__line" key={index}>
              {line || '​'}
            </span>
          ))}
        </pre>
      </div>
      {lines.length > limit && (
        <button className="btn btn--ghost more" onClick={() => setLimit((n) => n + CHUNK * 4)}>
          +{Math.min(CHUNK * 4, lines.length - limit).toLocaleString()}
        </button>
      )}
    </article>
  )
}
