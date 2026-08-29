export type DiagramResult = { ok: true; svg: string } | { ok: false; message: string }

let initializedFor: 'light' | 'dark' | null = null

/**
 * Mermaid 는 3MB 가 넘는다. ```mermaid 블록이 실제로 있을 때만 불러온다.
 */
export async function renderDiagrams(sources: string[], dark: boolean): Promise<DiagramResult[]> {
  if (sources.length === 0) return []
  const mermaid = (await import('mermaid')).default
  const theme = dark ? 'dark' : 'light'

  if (initializedFor !== theme) {
    mermaid.initialize({
      startOnLoad: false,
      theme: dark ? 'dark' : 'default',
      // 로컬 파일을 신뢰하지 않는다. mermaid 자체 살균을 켠다.
      securityLevel: 'strict',
      fontFamily: 'inherit',
      themeVariables: { fontSize: '14px' },
    })
    initializedFor = theme
  }

  const stamp = Date.now()
  const out: DiagramResult[] = []
  for (let i = 0; i < sources.length; i++) {
    try {
      const { svg } = await mermaid.render(`mmd-${stamp}-${i}`, sources[i])
      out.push({ ok: true, svg })
    } catch (err) {
      out.push({ ok: false, message: err instanceof Error ? err.message.split('\n')[0] : String(err) })
      // 실패하면 mermaid 가 임시 노드를 남긴다. 직접 치운다.
      document.getElementById(`dmmd-${stamp}-${i}`)?.remove()
      document.getElementById(`mmd-${stamp}-${i}`)?.remove()
    }
  }
  return out
}
