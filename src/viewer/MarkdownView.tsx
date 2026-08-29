import { useEffect, useMemo, useRef } from 'react'
import type { LoadedDoc } from '../types'
import { renderMarkdown } from './markdown'
import { useApp } from '../state/store'
import { useT } from '../i18n/useT'

/** `docs/a.md` 에서 `../b.md` 같은 상대 경로를 워크스페이스 경로로 되돌린다. */
function resolveRelative(from: string, rel: string): string {
  const base = from.split('/').slice(0, -1)
  const clean = rel.split('#')[0].split('?')[0]
  for (const part of clean.split('/')) {
    if (!part || part === '.') continue
    if (part === '..') base.pop()
    else base.push(part)
  }
  return base.join('/')
}

export function MarkdownView({ doc }: { doc: LoadedDoc }) {
  const t = useT()
  const workspace = useApp((s) => s.workspace)
  const select = useApp((s) => s.select)
  const wrapCode = useApp((s) => s.prefs.wrapCode)
  const hostRef = useRef<HTMLDivElement>(null)

  const { html, headings, words } = useMemo(() => renderMarkdown(doc.text), [doc.text])
  void headings // 목차 패널은 M2 에서 붙인다.

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

  useEffect(() => {
    hostRef.current?.scrollTo?.({ top: 0 })
  }, [doc.path])

  function onClick(event: React.MouseEvent<HTMLDivElement>) {
    const anchor = (event.target as HTMLElement).closest('a')
    if (!anchor) return

    const internalDoc = anchor.getAttribute('data-doc')
    if (internalDoc !== null) {
      event.preventDefault()
      const target = resolveRelative(doc.path, internalDoc)
      const found =
        workspace?.files.find((f) => f.path === target) ??
        workspace?.files.find((f) => f.path === `${target}.md`)
      if (found) void select(found.path)
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
