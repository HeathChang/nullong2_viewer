import { useT } from '@/shared/i18n/useT'
import type { Heading } from '../lib/render'

interface Props {
  headings: Heading[]
  activeId: string | null
  onJump: (id: string) => void
}

/** 문서 제목 목록. 스크롤에 따라 현재 위치를 표시한다. */
export function Outline({ headings, activeId, onJump }: Props) {
  const t = useT()
  const base = headings.length ? Math.min(...headings.map((h) => h.depth)) : 1

  return (
    <nav className="outline" aria-label={t('outline.title')}>
      <p className="outline__title">{t('outline.title')}</p>
      {headings.length === 0 ? (
        <p className="outline__empty">{t('outline.empty')}</p>
      ) : (
        <ul className="outline__list">
          {headings.map((heading) => (
            <li key={heading.id}>
              <button
                className={`outline__item${heading.id === activeId ? ' is-on' : ''}`}
                style={{ paddingLeft: 10 + Math.min(heading.depth - base, 3) * 11 }}
                onClick={() => onJump(heading.id)}
                title={heading.text}
              >
                {heading.text}
              </button>
            </li>
          ))}
        </ul>
      )}
    </nav>
  )
}
