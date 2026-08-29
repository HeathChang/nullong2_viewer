import { useMemo } from 'react'
import { useApp } from '../state/store'
import { makeTranslate, type Translate } from './index'

export function useT(): Translate {
  const lang = useApp((s) => s.prefs.lang)
  return useMemo(() => makeTranslate(lang), [lang])
}
