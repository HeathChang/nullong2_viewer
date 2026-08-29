import { useMemo } from 'react'
import hljs from '@/shared/lib/highlight'
import type { LoadedDoc } from '@/entities/document'

export function RawBlock({ doc, wrap }: { doc: LoadedDoc; wrap: boolean }) {
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
