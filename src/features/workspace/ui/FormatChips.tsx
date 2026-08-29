import type { FileKind } from '@/entities/document'
import { KIND_LABEL, KIND_ORDER } from '@/entities/document'
import { useT } from '@/shared/i18n/useT'
import { useWorkspace } from '../model/store'
import { countByKind } from '../model/filter'

/**
 * 이 폴더에 실제로 있는 형식만 개수와 함께 보여준다.
 * 없는 형식은 칩도 뜨지 않으므로, 칩 줄 자체가 "이 폴더에 뭐가 들었나"의 요약이 된다.
 */
export function FormatChips() {
  const t = useT()
  const workspace = useWorkspace((s) => s.workspace)
  const filter = useWorkspace((s) => s.filter)
  const toggleKind = useWorkspace((s) => s.toggleKind)
  const setIncludeHidden = useWorkspace((s) => s.setIncludeHidden)

  const counts = countByKind(workspace, filter.includeHidden)
  const present = KIND_ORDER.filter((kind) => (counts.get(kind) ?? 0) > 0)
  const hiddenTotal = workspace?.files.filter((node) => node.hidden).length ?? 0

  if (present.length === 0) return null

  return (
    <div className="chips">
      {present.map((kind) => {
        const on = filter.kinds.includes(kind)
        return (
          <button
            key={kind}
            className={`chip${on ? ' is-on' : ''}`}
            data-kind={kind}
            aria-pressed={on}
            onClick={() => toggleKind(kind)}
          >
            {labelOf(kind, t)}
            <span className="chip__n">{counts.get(kind)}</span>
          </button>
        )
      })}
      {hiddenTotal > 0 && (
        <button
          className={`chip chip--alt${filter.includeHidden ? ' is-on' : ''}`}
          data-kind="hidden"
          aria-pressed={filter.includeHidden}
          onClick={() => setIncludeHidden(!filter.includeHidden)}
        >
          {t('sidebar.hiddenFiles')}
          <span className="chip__n">{hiddenTotal}</span>
        </button>
      )}
    </div>
  )
}

function labelOf(kind: FileKind, t: ReturnType<typeof useT>): string {
  return kind === 'other' ? t('chip.other') : KIND_LABEL[kind]
}
