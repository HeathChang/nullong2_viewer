import { useEffect, useMemo, useRef } from 'react'
import type { LoadedDoc } from '@/entities/document'
import { useT } from '@/shared/i18n/useT'
import { usePrefs } from '@/shared/config/prefs'
import { renderMarkdown } from '../lib/render'
import { resolveRelative } from '../lib/links'

interface Props {
  doc: LoadedDoc
  /** 워크스페이스 경로로 해석된 문서 링크. 존재 여부 판단은 호출자가 한다. */
  onOpenDoc?: (path: string) => void
}

export function MarkdownView({ doc, onOpenDoc }: Props) {
  const t = useT()
  const wrapCode = usePrefs((s) => s.wrapCode)
  const hostRef = useRef<HTMLDivElement>(null)

  const { html, words } = useMemo(() => renderMarkdown(doc.text), [doc.text])

  // 코드 블록마다 복사 버튼을 심는다.
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    host.querySelectorAll<HTMLPreElement>('pre.code-block').forEach((pre) => {
      if (pre.querySelector('.code-copy')) return
      const button = document.createElement('button')
      button.className = 'code-copy'
      button.type = 'button'
      button.textContent = t('md.copyCode')
      button.addEventListener('click', () => {
        const text = pre.querySelector('code')?.textContent ?? ''
        void navigator.clipboard.writeText(text).then(() => {
          button.textContent = t('common.copied')
          button.classList.add('is-done')
          setTimeout(() => {
            button.textContent = t('md.copyCode')
            button.classList.remove('is-done')
          }, 1400)
        })
      })
      pre.appendChild(button)
    })
  }, [html, t])

  function onClick(event: React.MouseEvent<HTMLDivElement>) {
    const anchor = (event.target as HTMLElement).closest('a')
    if (!anchor) return

    const href = anchor.getAttribute('data-doc')
    if (href !== null) {
      event.preventDefault()
      onOpenDoc?.(resolveRelative(doc.path, href))
      return
    }

    if (anchor.getAttribute('data-anchor')) {
      event.preventDefault()
      const id = decodeURIComponent(anchor.getAttribute('href')!.slice(1))
      hostRef.current?.querySelector(`#${CSS.escape(id)}`)?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const minutes = Math.max(1, Math.round(words / 400))

  return (
    <article className={`reader markdown${wrapCode ? ' wrap-code' : ''}`}>
      <div className="reader__inner">
        <div
          ref={hostRef}
          className="markdown__body"
          onClick={onClick}
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <p className="reader__stats">{t('md.stats', { words, minutes })}</p>
      </div>
    </article>
  )
}
