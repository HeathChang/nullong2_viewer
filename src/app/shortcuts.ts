import { useEffect } from 'react'
import { isStructured } from '@/entities/document'
import { usePrefs } from '@/shared/config/prefs'
import { useWorkspace } from '@/features/workspace'
import { useUi } from './model/ui'
import { IS_MAC } from './platform'

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  return (
    el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable
  )
}

export function useGlobalShortcuts(): void {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const ui = useUi.getState()
      const ws = useWorkspace.getState()
      const prefs = usePrefs.getState()
      const mod = IS_MAC ? event.metaKey : event.ctrlKey

      if (event.key === 'Escape') {
        ui.closeOverlays()
        return
      }
      if (mod && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        ui.setPalette(!ui.paletteOpen)
        return
      }
      if (mod && event.shiftKey && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        ui.setSearchAll(!ui.searchAllOpen)
        return
      }
      if (mod && event.key.toLowerCase() === 'f' && !event.shiftKey) {
        event.preventDefault()
        // 구조적 데이터는 접힌 노드까지 뒤지는 자체 검색이 더 낫다. 그쪽으로 보낸다.
        const kind = ws.doc?.kind
        if (kind && isStructured(kind)) {
          document.querySelector<HTMLInputElement>('.data__search input')?.focus()
        } else {
          ui.setFind(true)
        }
        return
      }
      if (mod && event.shiftKey && event.key.toLowerCase() === 'o') {
        event.preventDefault()
        prefs.set('outlineOpen', !prefs.outlineOpen)
        return
      }
      if (mod && event.key.toLowerCase() === 'b') {
        event.preventDefault()
        ui.toggleSidebar()
        return
      }
      if (mod && event.key === ',') {
        event.preventDefault()
        ui.setSettings(true)
        return
      }
      if (mod && (event.key === '=' || event.key === '+')) {
        event.preventDefault()
        prefs.bumpFontSize(1)
        return
      }
      if (mod && event.key === '-') {
        event.preventDefault()
        prefs.bumpFontSize(-1)
        return
      }
      if (event.altKey && event.key === 'ArrowLeft') {
        event.preventDefault()
        ws.navigate(-1)
        return
      }
      if (event.altKey && event.key === 'ArrowRight') {
        event.preventDefault()
        ws.navigate(1)
        return
      }

      if (isTyping(event.target) || mod || event.altKey) return

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        ws.step(1)
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        ws.step(-1)
      } else if (event.key === 'r') {
        void ws.reload()
      } else if (event.key === '?') {
        ui.setShortcuts(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
