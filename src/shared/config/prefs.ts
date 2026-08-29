import { create } from 'zustand'
import { detectLang, type LangCode } from '@/shared/i18n'

export type ThemePref = 'system' | 'light' | 'dark'
export type FontPref = 'sans' | 'serif' | 'mono'

/** 읽기 화면의 생김새. 어떤 파일을 보여줄지(필터)는 workspace 쪽이 갖는다. */
export interface Prefs {
  lang: LangCode
  theme: ThemePref
  font: FontPref
  fontSize: number
  width: number
  lineHeight: number
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
    wrapCode: false,
  }
}

export function clamp(value: number, [min, max]: readonly [number, number]): number {
  return Math.min(max, Math.max(min, value))
}

const KEY = 'nullong:prefs'

function load(): Prefs {
  const base = defaultPrefs()
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...base, ...(JSON.parse(raw) as Partial<Prefs>) } : base
  } catch {
    return base
  }
}

function save(prefs: Prefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs))
  } catch {
    /* 저장 공간이 막혀 있어도 앱은 동작해야 한다 */
  }
}

/** 설정을 문서 루트의 CSS 변수와 data-theme 로 흘려보낸다. */
function apply(prefs: Prefs): void {
  const root = document.documentElement
  if (prefs.theme === 'system') delete root.dataset.theme
  else root.dataset.theme = prefs.theme
  root.lang = prefs.lang
  root.style.setProperty('--reader-font', `var(--font-${prefs.font})`)
  root.style.setProperty('--reader-size', `${prefs.fontSize}px`)
  root.style.setProperty('--reader-width', `${prefs.width}ch`)
  root.style.setProperty('--reader-lh', String(prefs.lineHeight))
}

interface PrefsState extends Prefs {
  set: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void
  bumpFontSize: (delta: number) => void
  reset: () => void
}

const initial = load()
apply(initial)

export const usePrefs = create<PrefsState>((setState, get) => ({
  ...initial,

  set: (key, value) => {
    setState({ [key]: value } as Partial<PrefsState>)
    const next = snapshot(get())
    save(next)
    apply(next)
  },

  bumpFontSize: (delta) => get().set('fontSize', clamp(get().fontSize + delta, FONT_SIZE_RANGE)),

  reset: () => {
    // 표시 언어는 사용자가 고른 값을 유지한다.
    const next = { ...defaultPrefs(), lang: get().lang }
    setState(next)
    save(next)
    apply(next)
  },
}))

function snapshot(state: PrefsState): Prefs {
  const { lang, theme, font, fontSize, width, lineHeight, wrapCode } = state
  return { lang, theme, font, fontSize, width, lineHeight, wrapCode }
}
