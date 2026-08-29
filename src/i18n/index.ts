import { ko, type Dict, type MsgKey } from './ko'
import { en } from './en'

export const LANGS: Record<string, Dict> = { ko, en }
export type LangCode = 'ko' | 'en'
export const LANG_LABELS: Record<LangCode, string> = { ko: '한국어', en: 'English' }

export function detectLang(): LangCode {
  for (const tag of navigator.languages ?? [navigator.language]) {
    if (tag.toLowerCase().startsWith('ko')) return 'ko'
    if (tag.toLowerCase().startsWith('en')) return 'en'
  }
  return 'en'
}

export type Translate = (key: MsgKey, vars?: Record<string, string | number>) => string

export function makeTranslate(lang: LangCode): Translate {
  const dict = LANGS[lang] ?? en
  return (key, vars) => {
    const raw = dict[key] ?? ko[key] ?? key
    if (!vars) return raw
    return raw.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m))
  }
}

export type { MsgKey }
