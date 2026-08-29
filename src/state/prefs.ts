import { detectLang, type LangCode } from '../i18n'

export type ThemePref = 'system' | 'light' | 'dark'
export type FontPref = 'sans' | 'serif' | 'mono'

export interface Prefs {
  lang: LangCode
  theme: ThemePref
  font: FontPref
  /** 본문 글자 크기(px) */
  fontSize: number
  /** 본문 너비(ch) */
  width: number
  lineHeight: number
  showAllFiles: boolean
  includeHidden: boolean
  wrapCode: boolean
}

export const FONT_SIZE_RANGE = [14, 22] as const
export const WIDTH_RANGE = [56, 108] as const
export const LINE_HEIGHT_RANGE = [1.5, 2.2] as const

export function defaultPrefs(): Prefs {
  return {
    lang: detectLang(),
    theme: 'system',
    font: 'sans',
    fontSize: 16,
    width: 74,
    lineHeight: 1.78,
    showAllFiles: false,
    includeHidden: false,
    wrapCode: false,
  }
}

const KEY = 'zzaim:prefs'

export function loadPrefs(): Prefs {
  const base = defaultPrefs()
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return base
    const saved = JSON.parse(raw) as Partial<Prefs>
    return { ...base, ...saved }
  } catch {
    return base
  }
}

export function savePrefs(prefs: Prefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs))
  } catch {
    /* 저장 공간이 막혀 있어도 앱은 동작해야 한다 */
  }
}

export function clamp(value: number, [min, max]: readonly [number, number]): number {
  return Math.min(max, Math.max(min, value))
}

/** 설정을 문서 루트의 CSS 변수와 data-theme 로 흘려보낸다. */
export function applyPrefs(prefs: Prefs): void {
  const root = document.documentElement
  root.dataset.theme = prefs.theme === 'system' ? '' : prefs.theme
  if (prefs.theme === 'system') delete root.dataset.theme
  root.lang = prefs.lang
  root.style.setProperty('--reader-font', `var(--font-${prefs.font})`)
  root.style.setProperty('--reader-size', `${prefs.fontSize}px`)
  root.style.setProperty('--reader-width', `${prefs.width}ch`)
  root.style.setProperty('--reader-lh', String(prefs.lineHeight))
}
