import { useMemo, useState } from 'react'
import { isOpenable } from '@/entities/document'
import { useT } from '@/shared/i18n/useT'
import { Icon } from '@/shared/ui/Icon'
import { useWorkspace } from '../model/store'
import { hiddenCount, pruneTree, visibleFiles } from '../model/filter'
import { FormatChips } from './FormatChips'
import { FileTree, iconFor } from './FileTree'

/** 경로 조각을 순서대로 만나면 통과하는 느슨한 부분일치 */
function fuzzyScore(haystack: string, needle: string): number {
  const target = haystack.toLowerCase()
  const query = needle.toLowerCase()
  const direct = target.indexOf(query)
  if (direct !== -1) return 1000 - direct
  let index = 0
  let score = 0
  for (const ch of query) {
    const found = target.indexOf(ch, index)
    if (found === -1) return -1
    score += found === index ? 3 : 1
    index = found + 1
  }
  return score
}

export function Sidebar() {
  const t = useT()
  const workspace = useWorkspace((s) => s.workspace)
  const filter = useWorkspace((s) => s.filter)
  const activePath = useWorkspace((s) => s.activePath)
  const select = useWorkspace((s) => s.select)
  const closeWorkspace = useWorkspace((s) => s.closeWorkspace)
  const showEverything = useWorkspace((s) => s.showEverything)
  const [query, setQuery] = useState('')

  const shown = useMemo(() => visibleFiles(workspace, filter), [workspace, filter])
  const tree = useMemo(
    () => (workspace ? pruneTree(workspace.root, filter) : null),
    [workspace, filter],
  )
  const hiddenTotal = useMemo(() => hiddenCount(workspace, filter), [workspace, filter])

  const matches = useMemo(() => {
    const needle = query.trim()
    if (!needle) return null
    return shown
      .map((file) => ({ file, score: fuzzyScore(file.path, needle) }))
      .filter((entry) => entry.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 200)
      .map((entry) => entry.file)
  }, [shown, query])

  if (!workspace) return null

  return (
    <aside className="sidebar">
      <header className="sidebar__head">
        <button className="sidebar__root" onClick={closeWorkspace} title={t('sidebar.changeFolder')}>
          <Icon name="folder" />
          <span className="sidebar__rootname">{workspace.name}</span>
        </button>
        {workspace.mode === 'snapshot' && (
          <span className="badge" title={t('open.snapshotNote')}>
            {t('badge.snapshot')}
          </span>
        )}
      </header>

      <div className="sidebar__filter">
        <Icon name="search" size={14} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('sidebar.filter')}
          aria-label={t('sidebar.filter')}
          spellCheck={false}
        />
        {query && (
          <button className="iconbtn" onClick={() => setQuery('')} aria-label={t('common.close')}>
            <Icon name="close" size={13} />
          </button>
        )}
      </div>

      <FormatChips />

      {workspace.truncated && (
        <p className="sidebar__warn">{t('sidebar.truncated', { n: workspace.files.length })}</p>
      )}

      <div className="tree">
        {matches ? (
          matches.length === 0 ? (
            <p className="tree__empty">{t('sidebar.noMatch')}</p>
          ) : (
            matches.map((file) => (
              <button
                key={file.path}
                className={`row row--flat${isOpenable(file.kind) ? '' : ' row--muted'}`}
                aria-current={file.path === activePath ? 'page' : undefined}
                onClick={() => void select(file.path)}
              >
                <Icon name={iconFor(file.kind)} size={14} />
                <span className="row__name">{file.name}</span>
                <span className="row__path">{file.path}</span>
              </button>
            ))
          )
        ) : tree ? (
          <FileTree
            root={tree}
            resetKey={workspace.root}
            activePath={activePath}
            onSelect={(path) => void select(path)}
          />
        ) : (
          <div className="tree__empty">
            {workspace.files.length === 0 ? (
              <>
                <p>{t('sidebar.noFiles')}</p>
                <p className="tree__hint">{t('sidebar.skipped')}</p>
              </>
            ) : (
              <>
                <p>{t('sidebar.filteredOut', { n: hiddenTotal })}</p>
                <button className="linkbtn" onClick={showEverything}>
                  {t('sidebar.showEverything')}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <footer className="sidebar__foot">
        <span>{t('sidebar.visible', { n: shown.length })}</span>
        {hiddenTotal > 0 && tree && (
          <button
            className="linkbtn"
            onClick={showEverything}
            title={t('sidebar.filteredOut', { n: hiddenTotal })}
          >
            {t('sidebar.showRest', { n: hiddenTotal })}
          </button>
        )}
      </footer>
    </aside>
  )
}
