import { parse as parseYaml, YAMLParseError } from 'yaml'
import type { FileKind } from '../types'

export interface StructuredOk {
  ok: true
  value: unknown
  /** 관용 파싱(주석·후행 쉼표 제거)으로 겨우 읽었는가 */
  lenient?: boolean
  /** JSONL 레코드 수 */
  records?: number
  /** JSONL 에서 해석하지 못한 줄 번호 */
  badLines?: number[]
}

export interface StructuredFail {
  ok: false
  message: string
  line?: number
}

export type StructuredResult = StructuredOk | StructuredFail

/** 문자열 리터럴을 건드리지 않고 주석과 후행 쉼표만 제거한다. */
function stripJsonc(text: string): string {
  let out = ''
  let i = 0
  let inString = false
  let quote = ''
  while (i < text.length) {
    const ch = text[i]
    const next = text[i + 1]
    if (inString) {
      out += ch
      if (ch === '\\') {
        out += next ?? ''
        i += 2
        continue
      }
      if (ch === quote) inString = false
      i++
      continue
    }
    if (ch === '"' || ch === "'") {
      inString = true
      quote = ch
      out += ch
      i++
      continue
    }
    if (ch === '/' && next === '/') {
      while (i < text.length && text[i] !== '\n') i++
      continue
    }
    if (ch === '/' && next === '*') {
      i += 2
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++
      i += 2
      continue
    }
    out += ch
    i++
  }
  // 후행 쉼표
  return out.replace(/,(\s*[}\]])/g, '$1')
}

function lineOfPosition(text: string, position: number): number {
  let line = 1
  for (let i = 0; i < position && i < text.length; i++) if (text[i] === '\n') line++
  return line
}

function jsonErrorLine(text: string, err: unknown): number | undefined {
  const message = err instanceof Error ? err.message : ''
  const explicit = message.match(/line (\d+)/i)
  if (explicit) return Number(explicit[1])
  const position = message.match(/position (\d+)/i)
  if (position) return lineOfPosition(text, Number(position[1]))
  return undefined
}

function parseJsonLike(text: string): StructuredResult {
  const trimmed = text.trim()
  if (!trimmed) return { ok: true, value: null }
  try {
    return { ok: true, value: JSON.parse(trimmed) }
  } catch (first) {
    try {
      return { ok: true, value: JSON.parse(stripJsonc(trimmed)), lenient: true }
    } catch {
      return {
        ok: false,
        message: first instanceof Error ? first.message : String(first),
        line: jsonErrorLine(text, first),
      }
    }
  }
}

function parseJsonLines(text: string): StructuredResult {
  const records: unknown[] = []
  const badLines: number[] = []
  const lines = text.split(/\r?\n/)
  lines.forEach((line, index) => {
    const trimmed = line.trim()
    if (!trimmed) return
    try {
      records.push(JSON.parse(trimmed))
    } catch {
      badLines.push(index + 1)
    }
  })
  if (records.length === 0 && badLines.length > 0) {
    return { ok: false, message: 'no valid JSON records', line: badLines[0] }
  }
  return { ok: true, value: records, records: records.length, badLines }
}

function parseYamlText(text: string): StructuredResult {
  if (!text.trim()) return { ok: true, value: null }
  try {
    return { ok: true, value: parseYaml(text) }
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message.split('\n')[0] : String(err),
      line: err instanceof YAMLParseError ? err.linePos?.[0]?.line : undefined,
    }
  }
}

export function parseStructured(text: string, kind: FileKind): StructuredResult {
  if (kind === 'jsonl') return parseJsonLines(text)
  if (kind === 'yaml') return parseYamlText(text)
  return parseJsonLike(text)
}

// ---------------------------------------------------------------- 값 유틸

export type ValueType = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null'

export function typeOf(value: unknown): ValueType {
  if (value === null || value === undefined) return 'null'
  if (Array.isArray(value)) return 'array'
  const t = typeof value
  if (t === 'object') return 'object'
  if (t === 'number' || t === 'bigint') return 'number'
  if (t === 'boolean') return 'boolean'
  return 'string'
}

export function isBranch(value: unknown): boolean {
  const t = typeOf(value)
  return t === 'object' || t === 'array'
}

export function childEntries(value: unknown): [string, unknown][] {
  if (Array.isArray(value)) return value.map((v, i) => [String(i), v])
  if (value && typeof value === 'object') return Object.entries(value as Record<string, unknown>)
  return []
}

/** JSONPath 형태의 경로 문자열 */
export function joinPath(parent: string, key: string, inArray: boolean): string {
  return inArray ? `${parent}[${key}]` : parent ? `${parent}.${key}` : `$.${key}`
}

export function previewOf(value: unknown): string {
  const t = typeOf(value)
  if (t === 'array') return `[ ${(value as unknown[]).length} ]`
  if (t === 'object') return `{ ${Object.keys(value as object).length} }`
  return ''
}

/** 노드 개수를 상한까지만 센다. 거대한 파일에서 전체 순회를 피한다. */
export function countNodes(value: unknown, limit = 200_000): number {
  let count = 0
  const stack: unknown[] = [value]
  while (stack.length && count < limit) {
    const current = stack.pop()
    count++
    if (isBranch(current)) for (const [, child] of childEntries(current)) stack.push(child)
  }
  return count
}
