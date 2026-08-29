import type { FileKind } from './types'

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
  yml: 'yaml',
  yaml: 'yaml',
  txt: 'text',
  text: 'text',
  log: 'text',
  csv: 'text',
  tsv: 'text',
  toml: 'text',
  ini: 'text',
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
  gitignore: 'text',
}

/** 확장자가 없어도 텍스트로 읽는 게 자연스러운 이름들 */
const BARE = /^(readme|license|licence|changelog|authors|contributing|notice|makefile|dockerfile)$/i

export function extensionOf(name: string): string {
  const i = name.lastIndexOf('.')
  return i <= 0 ? '' : name.slice(i + 1).toLowerCase()
}

export function kindOf(name: string): FileKind {
  const ext = extensionOf(name)
  if (ext) return EXT[ext] ?? 'other'
  return BARE.test(name) ? 'text' : 'other'
}

/** 트리 뷰(JSON·YAML·JSONL)로 렌더하는 구조적 데이터인가 */
export function isStructured(kind: FileKind): boolean {
  return kind === 'json' || kind === 'jsonl' || kind === 'yaml'
}

export function isOpenable(kind: FileKind): boolean {
  return kind !== 'other'
}

/** 형식 칩에 쓰는 순서와 라벨. 'other' 라벨만 번역이 필요하다. */
export const KIND_ORDER: FileKind[] = ['markdown', 'json', 'jsonl', 'yaml', 'text', 'other']

export const KIND_LABEL: Record<Exclude<FileKind, 'other'>, string> = {
  markdown: 'MD',
  json: 'JSON',
  jsonl: 'JSONL',
  yaml: 'YAML',
  text: 'TEXT',
}

export function isHiddenPath(path: string): boolean {
  return path.split('/').some((segment) => segment.startsWith('.'))
}
