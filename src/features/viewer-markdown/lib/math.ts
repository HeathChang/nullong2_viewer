import type { MathBlock } from './render'

export type MathResult = { ok: true; html: string } | { ok: false; message: string }

let cssLoaded = false

/** KaTeX 와 그 CSS 는 수식이 실제로 있을 때만 불러온다. 글꼴도 같이 딸려 온다. */
export async function renderMath(blocks: MathBlock[]): Promise<MathResult[]> {
  if (blocks.length === 0) return []
  const katex = (await import('katex')).default
  if (!cssLoaded) {
    await import('katex/dist/katex.min.css')
    cssLoaded = true
  }

  return blocks.map((block) => {
    try {
      return {
        ok: true as const,
        html: katex.renderToString(block.tex, {
          displayMode: block.display,
          throwOnError: true,
          strict: false,
        }),
      }
    } catch (err) {
      return {
        ok: false as const,
        message: err instanceof Error ? err.message.replace(/^KaTeX parse error:\s*/, '') : String(err),
      }
    }
  })
}
