import { Marked, type Tokens } from 'marked'
import DOMPurify from 'dompurify'
import hljs from '@/shared/lib/highlight'

export interface Heading {
  id: string
  text: string
  depth: number
}

export interface MathBlock {
  tex: string
  display: boolean
}

export interface RenderedMarkdown {
  html: string
  headings: Heading[]
  words: number
  /** ```mermaid 블록의 원문. 자리표시자의 data-mermaid 인덱스와 짝을 이룬다. */
  mermaid: string[]
  /** $…$ · $$…$$ 수식 원문. data-math 인덱스와 짝을 이룬다. */
  math: MathBlock[]
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

/** 실제 이미지가 붙기 전까지 자리만 잡아 두는 투명 1x1 */
const BLANK_PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='

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
  // 원문을 HTML 속성에 넣으면 이스케이프가 꼬인다. 배열에 담고 인덱스만 심는다.
  const mermaid: string[] = []
  const math: MathBlock[] = []

  const marked = new Marked({ gfm: true, breaks: false })

  marked.use({
    extensions: [
      {
        name: 'blockMath',
        level: 'block',
        start: (src: string) => src.indexOf('$$'),
        tokenizer(src: string) {
          const match = /^\$\$([\s\S]+?)\$\$/.exec(src)
          if (!match) return undefined
          return { type: 'blockMath', raw: match[0], text: match[1].trim() }
        },
        renderer(token: Tokens.Generic) {
          math.push({ tex: String(token.text), display: true })
          return `<div class="math-block" data-math="${math.length - 1}"></div>\n`
        },
      },
      {
        name: 'inlineMath',
        level: 'inline',
        start: (src: string) => src.indexOf('$'),
        tokenizer(src: string) {
          // 앞뒤로 공백이 붙으면 수식이 아니라 금액일 확률이 높다.
          const match = /^\$(?!\s)([^$\n]+?)(?<!\s)\$/.exec(src)
          if (!match) return undefined
          return { type: 'inlineMath', raw: match[0], text: match[1] }
        },
        renderer(token: Tokens.Generic) {
          math.push({ tex: String(token.text), display: false })
          return `<span class="math-inline" data-math="${math.length - 1}"></span>`
        },
      },
    ],
  })

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
        if (lang === 'mermaid') {
          mermaid.push(token.text)
          return `<div class="mermaid-block" data-mermaid="${mermaid.length - 1}"></div>\n`
        }
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
        // 폴더 안의 이미지. 실제 src 는 뷰어가 워크스페이스에서 찾아 끼운다.
        return `<img class="img-pending" data-rel="${escapeHtml(href)}" src="${BLANK_PIXEL}" alt="${alt}"${title}>`
      },
    },
  })

  const raw = marked.parse(source, { async: false })
  const html = DOMPurify.sanitize(raw, {
    ADD_ATTR: ['target', 'rel', 'loading'],
    FORBID_TAGS: ['style'],
  })

  return { html, headings, words: countWords(source), mermaid, math }
}
