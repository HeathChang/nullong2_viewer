import { useMemo } from 'react'
import { usePrefs } from '@/shared/config/prefs'
import { makeTranslate, type Translate } from './index'

export function useT(): Translate {
  const lang = usePrefs((s) => s.lang)
  return useMemo(() => makeTranslate(lang), [lang])
}
