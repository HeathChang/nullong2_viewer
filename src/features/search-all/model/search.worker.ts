import { decodeBuffer } from '@/shared/lib/decode'
import {
  MAX_HITS,
  MAX_HITS_PER_FILE,
  MAX_SEARCH_BYTES,
  type SearchHit,
  type SearchRequest,
  type SearchTarget,
  type SearchUpdate,
} from './types'

/**
 * 폴더 전체 내용 검색. 메인 스레드에서 돌리면 입력이 끊기므로 워커에서 훑는다.
 * 새 요청이 오면 id 가 바뀌고, 파일 사이마다 확인해 즉시 그만둔다.
 */
const ctx = self as unknown as {
  postMessage(message: SearchUpdate): void
  onmessage: ((event: MessageEvent<SearchRequest>) => void) | null
}

let currentId = 0
const MAX_LINE = 240

function trimLine(line: string, at: number): { text: string; col: number } {
  if (line.length <= MAX_LINE) return { text: line, col: at }
  const start = Math.max(0, at - 60)
  const end = Math.min(line.length, start + MAX_LINE)
  const text = (start > 0 ? '…' : '') + line.slice(start, end) + (end < line.length ? '…' : '')
  return { text, col: at - start + (start > 0 ? 1 : 0) }
}

async function readText(target: SearchTarget): Promise<string | null> {
  const file = target.handle ? await target.handle.getFile() : target.file
  if (!file || file.size > MAX_SEARCH_BYTES) return null
  return decodeBuffer(await file.arrayBuffer()).text
}

function scanText(text: string, needle: string, path: string): SearchHit[] {
  const hits: SearchHit[] = []
  const lines = text.split(/\r?\n/)
  for (let i = 0; i < lines.length && hits.length < MAX_HITS_PER_FILE; i++) {
    const lower = lines[i].toLowerCase()
    const at = lower.indexOf(needle)
    if (at === -1) continue
    const { text: shown, col } = trimLine(lines[i], at)
    hits.push({ path, line: i + 1, text: shown, col, length: needle.length })
  }
  return hits
}

ctx.onmessage = async (event) => {
  const { id, query, targets } = event.data
  currentId = id
  const needle = query.toLowerCase()

  const hits: SearchHit[] = []
  const seenFiles = new Set<string>()
  let scanned = 0
  let skipped = 0
  let truncated = false

  const send = (done: boolean) =>
    ctx.postMessage({
      id,
      scanned,
      total: targets.length,
      hits: [...hits],
      files: seenFiles.size,
      done,
      truncated,
      skipped,
    })

  for (const target of targets) {
    if (currentId !== id) return // 새 검색이 시작됐다
    try {
      const text = await readText(target)
      if (text === null) {
        skipped++
      } else {
        const found = scanText(text, needle, target.path)
        if (found.length > 0) {
          seenFiles.add(target.path)
          for (const hit of found) {
            if (hits.length >= MAX_HITS) {
              truncated = true
              break
            }
            hits.push(hit)
          }
        }
      }
    } catch {
      skipped++
    }
    scanned++
    if (truncated) break
    // 진행 상황을 너무 자주 보내면 그것대로 부담이다.
    if (scanned % 25 === 0) send(false)
  }

  if (currentId === id) send(true)
}
