import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { LoadedDoc } from '@/entities/document'
import { useT } from '@/shared/i18n/useT'
import { usePrefs } from '@/shared/config/prefs'
import { renderMarkdown } from '../lib/render'
import { resolveRelative } from '../lib/links'
import { Outline } from './Outline'

export interface MarkdownViewProps {
  doc: LoadedDoc
  /** 워크스페이스 경로로 해석된 문서 링크. 존재 여부 판단은 호출자가 한다. */
  onOpenDoc?: (path: string) => void
  /** 워크스페이스 경로의 이미지를 표시 가능한 URL 로 바꿔 준다. 없으면 null. */
  resolveImage?: (path: string) => Promise<string | null>
}

/**
 * 본문 DOM 은 React 가 아니라 이 컴포넌트가 소유한다.
 * dangerouslySetInnerHTML 로 맡기면 React 가 커밋할 때마다 내용을 다시 써서,
 * 우리가 심은 복사 버튼·이미지·앵커가 조용히 사라진다.
 */
export function MarkdownView({ doc, onOpenDoc, resolveImage }: MarkdownViewProps) {
  const t = useT()
  const wrapCode = usePrefs((s) => s.wrapCode)
  const outlineOpen = usePrefs((s) => s.outlineOpen)
  const hostRef = useRef<HTMLDivElement>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [painted, setPainted] = useState(0)

  const { html, headings, words } = useMemo(() => renderMarkdown(doc.text), [doc.text])

  // 1) 본문을 직접 그린다. 이후 장식은 이 DOM 위에서만 일어난다.
  useLayoutEffect(() => {
    const host = hostRef.current
    if (!host) return
    host.innerHTML = html
    setPainted((n) => n + 1)
  }, [html])

  // 2) 코드 블록마다 복사 버튼
  useEffect(() => {
    const host = hostRef.current
    if (!host || painted === 0) return
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
  }, [painted, t])

  // 3) 폴더 안의 상대경로 이미지를 실제로 붙인다.
  useEffect(() => {
    const host = hostRef.current
    if (!host || painted === 0 || !resolveImage) return
    let cancelled = false

    for (const img of Array.from(host.querySelectorAll<HTMLImageElement>('img[data-rel]'))) {
      const rel = img.dataset.rel
      if (!rel) continue
      void resolveImage(resolveRelative(doc.path, rel)).then((url) => {
        if (cancelled || !img.isConnected) return
        if (url) {
          img.src = url
          img.classList.remove('img-pending')
        } else {
          img.replaceWith(missingImage(img.alt || rel, t('md.imageMissing')))
        }
      })
    }
    return () => {
      cancelled = true
    }
  }, [painted, doc.path, resolveImage, t])

  // 4) 스크롤에 따라 목차의 현재 위치를 표시한다.
  useEffect(() => {
    const host = hostRef.current
    if (!host || painted === 0 || headings.length === 0) return
    const targets = headings
      .map((heading) => host.querySelector<HTMLElement>(`#${CSS.escape(heading.id)}`))
      .filter((el): el is HTMLElement => el !== null)
    if (targets.length === 0) return

    const seen = new Map<string, boolean>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) seen.set(entry.target.id, entry.isIntersecting)
        const current = targets.find((el) => seen.get(el.id))
        // 위쪽 밴드에 아무것도 없으면 마지막으로 지나친 제목을 유지한다.
        if (current) setActiveId(current.id)
      },
      { rootMargin: '0px 0px -72% 0px', threshold: 0 },
    )
    targets.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [painted, headings])

  useEffect(() => setActiveId(null), [doc.path])

  function jumpTo(id: string) {
    hostRef.current?.querySelector(`#${CSS.escape(id)}`)?.scrollIntoView({ behavior: 'smooth' })
  }

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
      jumpTo(decodeURIComponent(anchor.getAttribute('href')!.slice(1)))
    }
  }

  const minutes = Math.max(1, Math.round(words / 400))
  const showOutline = outlineOpen && headings.length > 0

  return (
    <article
      className={`reader markdown${wrapCode ? ' wrap-code' : ''}${showOutline ? ' has-outline' : ''}`}
    >
      <div className="reader__inner">
        <div ref={hostRef} className="markdown__body" onClick={onClick} />
        <p className="reader__stats">{t('md.stats', { words, minutes })}</p>
      </div>
      {showOutline && <Outline headings={headings} activeId={activeId} onJump={jumpTo} />}
    </article>
  )
}

function missingImage(label: string, note: string): HTMLElement {
  const span = document.createElement('span')
  span.className = 'img-placeholder'
  span.title = note
  span.textContent = `⚠ ${label}`
  return span
}
