/**
 * 텍스트 인코딩 추론.
 * UTF-8 이 아닌 한국어(CP949)/일본어(Shift_JIS)/중국어(GB18030, Big5) 레거시 파일도
 * 깨지지 않고 열리도록 순차적으로 시도한다.
 */
const CANDIDATES = ['euc-kr', 'shift_jis', 'gb18030', 'big5', 'windows-1252'] as const

function tryDecode(buf: ArrayBuffer, label: string): string | null {
  try {
    return new TextDecoder(label, { fatal: true }).decode(buf)
  } catch {
    return null
  }
}

/** 디코딩 결과가 얼마나 "말이 되는지" 점수화한다. 낮을수록 좋다. */
function penalty(text: string): number {
  let score = 0
  for (const ch of text) {
    const code = ch.codePointAt(0)!
    if (code === 0xfffd) score += 10
    // 제어문자 (탭/개행/캐리지리턴 제외)
    else if (code < 0x20 && code !== 9 && code !== 10 && code !== 13) score += 5
    // 라틴-1 보충 영역의 기호는 잘못 디코딩된 CJK 의 전형적인 흔적
    else if (code >= 0x80 && code <= 0xbf) score += 1
  }
  return score / Math.max(1, text.length)
}

export function decodeBuffer(buf: ArrayBuffer): { text: string; encoding: string } {
  const head = new Uint8Array(buf.slice(0, 4))

  if (head[0] === 0xef && head[1] === 0xbb && head[2] === 0xbf) {
    return { text: new TextDecoder('utf-8').decode(buf).slice(1), encoding: 'UTF-8 (BOM)' }
  }
  if (head[0] === 0xff && head[1] === 0xfe) {
    return { text: new TextDecoder('utf-16le').decode(buf), encoding: 'UTF-16LE' }
  }
  if (head[0] === 0xfe && head[1] === 0xff) {
    return { text: new TextDecoder('utf-16be').decode(buf), encoding: 'UTF-16BE' }
  }

  const utf8 = tryDecode(buf, 'utf-8')
  if (utf8 !== null) return { text: utf8, encoding: 'UTF-8' }

  let best: { text: string; encoding: string; score: number } | null = null
  for (const label of CANDIDATES) {
    const text = tryDecode(buf, label)
    if (text === null) continue
    const score = penalty(text)
    if (!best || score < best.score) best = { text, encoding: label.toUpperCase(), score }
    if (score === 0) break
  }
  if (best) return { text: best.text, encoding: best.encoding }

  return { text: new TextDecoder('utf-8').decode(buf), encoding: 'UTF-8 (일부 손상)' }
}
