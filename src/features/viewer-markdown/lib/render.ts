import { Marked, type Tokens } from 'marked'
import DOMPurify from 'dompurify'
import hljs from '@/shared/lib/highlight'

export interface Heading {
  id: string
  text: string
  depth: number
}

export interface RenderedMarkdown {
  html: string
  headings: Heading[]
  words: number
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 유니코드 글자를 살리는 슬러그. 한국어 제목도 그대로 앵커가 된다. */
function slugify(text: string): string {
  return (
    text
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'section'
  )
}

const EXTERNAL = /^(https?:|mailto:|tel:)/i

function countWords(text: string): number {
  // 라틴 문자는 공백으로, CJK 는 글자 수로 센다.
  const cjk = text.match(/[぀-ヿ㐀-䶿一-鿿가-힯]/g)?.length ?? 0
  const latin = text.replace(/[぀-ヿ㐀-䶿一-鿿가-힯]/g, ' ').trim()
  const latinWords = latin ? latin.split(/\s+/).length : 0
  return cjk + latinWords
}

export function renderMarkdown(source: string): RenderedMarkdown {
  const headings: Heading[] = []
  const used = new Map<string, number>()

  const marked = new Marked({ gfm: true, breaks: false })

  marked.use({
    renderer: {
      heading(this: { parser: { parseInline(t: Tokens.Generic[]): string } }, token: Tokens.Heading) {
        const inline = this.parser.parseInline(token.tokens)
        const plain = token.text.replace(/<[^>]*>/g, '')
        const base = slugify(plain)
        const seen = used.get(base) ?? 0
        used.set(base, seen + 1)
        const id = seen === 0 ? base : `${base}-${seen}`
        headings.push({ id, text: plain, depth: token.depth })
        return `<h${token.depth} id="${id}">${inline}<a class="anchor" href="#${id}" aria-hidden="true" tabindex="-1">#</a></h${token.depth}>\n`
      },

      code(token: Tokens.Code) {
        const lang = (token.lang ?? '').trim().split(/\s+/)[0]
        let body: string
        let label = lang
        if (lang && hljs.getLanguage(lang)) {
          body = hljs.highlight(token.text, { language: lang, ignoreIllegals: true }).value
        } else {
          const auto = lang ? null : hljs.highlightAuto(token.text)
          body = auto ? auto.value : escapeHtml(token.text)
          label = label || auto?.language || ''
        }
        const attr = label ? ` data-lang="${escapeHtml(label)}"` : ''
        return `<pre class="code-block"${attr}><code class="hljs">${body}</code></pre>\n`
      },

      link(this: { parser: { parseInline(t: Tokens.Generic[]): string } }, token: Tokens.Link) {
        const inner = this.parser.parseInline(token.tokens)
        const href = token.href ?? ''
        const title = token.title ? ` title="${escapeHtml(token.title)}"` : ''
        if (EXTERNAL.test(href)) {
          return `<a href="${escapeHtml(href)}"${title} target="_blank" rel="noopener noreferrer">${inner}</a>`
        }
        if (href.startsWith('#')) {
          return `<a href="${escapeHtml(href)}"${title} data-anchor="1">${inner}</a>`
        }
        // 폴더 안의 다른 문서. 실제 이동은 뷰어가 가로챈다.
        return `<a href="#" data-doc="${escapeHtml(href)}"${title}>${inner}</a>`
      },

      image(token: Tokens.Image) {
        const href = token.href ?? ''
        const alt = escapeHtml(token.text ?? '')
        const title = token.title ? ` title="${escapeHtml(token.title)}"` : ''
        if (EXTERNAL.test(href) || href.startsWith('data:')) {
          return `<img src="${escapeHtml(href)}" alt="${alt}"${title} loading="lazy">`
        }
        // 상대경로 이미지 해석은 M3(이미지 포맷 지원)에서 붙인다.
        return `<span class="img-placeholder" data-src="${escapeHtml(href)}">🖼 ${alt || escapeHtml(href)}</span>`
      },
    },
  })

  const raw = marked.parse(source, { async: false })
  const html = DOMPurify.sanitize(raw, {
    ADD_ATTR: ['target', 'rel', 'loading'],
    FORBID_TAGS: ['style'],
  })

  return { html, headings, words: countWords(source) }
}
