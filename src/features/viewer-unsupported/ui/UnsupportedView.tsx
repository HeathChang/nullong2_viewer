import type { LoadedDoc } from '@/entities/document'
import { extensionOf } from '@/entities/document'
import { useT } from '@/shared/i18n/useT'
import { formatBytes, formatWhen } from '@/shared/lib/format'
import { Icon } from '@/shared/ui/Icon'

/**
 * 열 수 없는 형식이라도 "여기 있다"는 사실은 보여준다.
 * 목록에서 지워 버리면 폴더가 실제보다 비어 보인다.
 */
export function UnsupportedView({ doc }: { doc: LoadedDoc }) {
  const t = useT()
  const ext = extensionOf(doc.name)

  return (
    <div className="unsupported">
      <div className="unsupported__card">
        <Icon name="blank" size={22} />
        <h2>{t('unsupported.title')}</h2>
        <p>{t('unsupported.body')}</p>
        <dl className="unsupported__meta">
          <div>
            <dt>{t('unsupported.type')}</dt>
            <dd>{ext ? `.${ext}` : '—'}</dd>
          </div>
          <div>
            <dt>{t('unsupported.size')}</dt>
            <dd>{formatBytes(doc.size)}</dd>
          </div>
          <div>
            <dt>{t('unsupported.modified')}</dt>
            <dd>{formatWhen(doc.lastModified)}</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
