import type { FileKind } from '../types'

const EXT: Record<string, FileKind> = {
  md: 'markdown',
  markdown: 'markdown',
  mdown: 'markdown',
  mkd: 'markdown',
  mdx: 'markdown',
  json: 'json',
  jsonc: 'json',
  json5: 'json',
  jsonl: 'jsonl',
  ndjson: 'jsonl',
  txt: 'text',
  text: 'text',
  log: 'text',
  yml: 'yaml',
  yaml: 'yaml',
  toml: 'text',
  ini: 'text',
  csv: 'text',
  tsv: 'text',
  env: 'text',
  xml: 'text',
  html: 'text',
  css: 'text',
  js: 'text',
  jsx: 'text',
  ts: 'text',
  tsx: 'text',
  py: 'text',
  go: 'text',
  rs: 'text',
  java: 'text',
  kt: 'text',
  rb: 'text',
  sh: 'text',
  sql: 'text',
}

export function extensionOf(name: string): string {
  const i = name.lastIndexOf('.')
  return i <= 0 ? '' : name.slice(i + 1).toLowerCase()
}

export function kindOf(name: string): FileKind | null {
  return EXT[extensionOf(name)] ?? null
}

/** 확장자 없는 README, LICENSE 같은 파일도 텍스트로 열어준다. */
export function kindOrText(name: string): FileKind {
  return kindOf(name) ?? 'text'
}

/** MVP 의 1급 포맷. 사이드바 기본 필터가 이 기준을 쓴다. */
export function isPrimary(kind: FileKind): boolean {
  return kind !== 'text'
}

/** JSON 트리 뷰로 렌더하는 구조적 데이터인가 */
export function isStructured(kind: FileKind): boolean {
  return kind === 'json' || kind === 'jsonl' || kind === 'yaml'
}
