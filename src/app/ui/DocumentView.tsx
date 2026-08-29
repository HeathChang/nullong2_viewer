import type { LoadedDoc } from '@/entities/document'
import { MarkdownView } from '@/features/viewer-markdown'
import { DataView } from '@/features/viewer-data'
import { TextView } from '@/features/viewer-text'
import { UnsupportedView } from '@/features/viewer-unsupported'

/**
 * 포맷을 하나 더 지원하는 비용이 여기 한 줄이 되도록 유지한다.
 * 뷰어는 워크스페이스를 모르고, 문서 링크만 위로 올려 보낸다.
 */
export function DocumentView({
  doc,
  onOpenDoc,
}: {
  doc: LoadedDoc
  onOpenDoc: (path: string) => void
}) {
  switch (doc.kind) {
    case 'markdown':
      return <MarkdownView doc={doc} onOpenDoc={onOpenDoc} />
    case 'json':
    case 'jsonl':
    case 'yaml':
      return <DataView doc={doc} />
    case 'text':
      return <TextView doc={doc} />
    default:
      return <UnsupportedView doc={doc} />
  }
}
