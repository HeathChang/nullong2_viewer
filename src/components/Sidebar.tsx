import { useEffect, useMemo, useRef, useState } from 'react'
import type { DirNode, FileKind, FileNode } from '../types'
import { useApp } from '../state/store'
import { useT } from '../i18n/useT'
import { Icon, type IconName } from './Icon'

function iconFor(kind: FileKind): IconName {
  return kind === 'json' || kind === 'jsonl' || kind === 'yaml' ? 'braces' : 'doc'
}

function ancestorsOf(path: string): string[] {
  const parts = path.split('/')
  parts.pop()
  const out: string[] = []
  let current = ''
  for (const part of parts) {
    current = current ? `${current}/${part}` : part
    out.push(current)
  }
  return out
}

/** 필터가 걸렸을 때 쓰는 느슨한 부분일치. 경로 조각을 순서대로 만나면 통과. */
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
  const workspace = useApp((s) => s.workspace)
  const activePath = useApp((s) => s.activePath)
  const select = useApp((s) => s.select)
  const closeWorkspace = useApp((s) => s.closeWorkspace)
  const showAllFiles = useApp((s) => s.prefs.showAllFiles)
  const setPref = useApp((s) => s.setPref)

  const [filter, setFilter] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const listRef = useRef<HTMLDivElement>(null)

  // 폴더를 열면 최상위 폴더는 펼쳐 둔다. 트리가 처음부터 쓸모 있어야 한다.
  useEffect(() => {
    setExpanded(new Set(workspace?.root.dirs.map((dir) => dir.path) ?? []))
  }, [workspace])

  // 현재 문서까지의 경로도 항상 펼쳐 둔다.
  useEffect(() => {
    if (!activePath) return
    setExpanded((prev) => {
      const next = new Set(prev)
      for (const dir of ancestorsOf(activePath)) next.add(dir)
      return next
    })
  }, [activePath])

  useEffect(() => {
    const row = listRef.current?.querySelector('[aria-current="page"]')
    row?.scrollIntoView({ block: 'nearest' })
  }, [activePath])

  const visible = useMemo(
    () => (workspace ? workspace.files.filter((f) => showAllFiles || f.kind !== 'text') : []),
    [workspace, showAllFiles],
  )

  const matches = useMemo(() => {
    if (!filter.trim()) return null
    return visible
      .map((file) => ({ file, score: fuzzyScore(file.path, filter.trim()) }))
      .filter((entry) => entry.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 200)
      .map((entry) => entry.file)
  }, [visible, filter])

  if (!workspace) return null

  function toggleDir(path: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  return (
    <aside className="sidebar">
      <header className="sidebar__head">
        <button
          className="sidebar__root"
          onClick={closeWorkspace}
          title={t('sidebar.changeFolder')}
        >
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
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder={t('sidebar.filter')}
          aria-label={t('sidebar.filter')}
          spellCheck={false}
        />
        {filter && (
          <button className="iconbtn" onClick={() => setFilter('')} aria-label={t('common.close')}>
            <Icon name="close" size={13} />
          </button>
        )}
      </div>

      <div className="sidebar__meta">
        <span>{t('sidebar.count', { n: visible.length })}</span>
        <button
          className="linkbtn"
          onClick={() => setPref('showAllFiles', !showAllFiles)}
          title={showAllFiles ? t('sidebar.onlyDocs') : t('sidebar.showAll')}
        >
          {showAllFiles ? t('sidebar.onlyDocs') : t('sidebar.showAll')}
        </button>
      </div>

      {workspace.truncated && (
        <p className="sidebar__warn">{t('sidebar.truncated', { n: workspace.files.length })}</p>
      )}

      <div className="tree" ref={listRef}>
        {matches ? (
          matches.length === 0 ? (
            <p className="tree__empty">{t('sidebar.noMatch')}</p>
          ) : (
            matches.map((file) => (
              <button
                key={file.path}
                className="row row--flat"
                aria-current={file.path === activePath ? 'page' : undefined}
                onClick={() => void select(file.path)}
              >
                <Icon name={iconFor(file.kind)} size={14} />
                <span className="row__name">{file.name}</span>
                <span className="row__path">{file.path}</span>
              </button>
            ))
          )
        ) : visible.length === 0 ? (
          <p className="tree__empty">{t('sidebar.empty')}</p>
        ) : (
          <DirBody
            dir={workspace.root}
            depth={0}
            expanded={expanded}
            toggleDir={toggleDir}
            activePath={activePath}
            onSelect={(path) => void select(path)}
            showAllFiles={showAllFiles}
          />
        )}
      </div>
    </aside>
  )
}

interface DirBodyProps {
  dir: DirNode
  depth: number
  expanded: Set<string>
  toggleDir: (path: string) => void
  activePath: string | null
  onSelect: (path: string) => void
  showAllFiles: boolean
}

function DirBody(props: DirBodyProps) {
  const { dir, depth, expanded, toggleDir, activePath, onSelect, showAllFiles } = props
  const files = dir.files.filter((f: FileNode) => showAllFiles || f.kind !== 'text')

  return (
    <>
      {dir.dirs.map((child) => {
        const open = expanded.has(child.path)
        return (
          <div key={child.path}>
            <button
              className={`row row--dir${open ? ' is-open' : ''}`}
              style={{ paddingLeft: 10 + depth * 12 }}
              onClick={() => toggleDir(child.path)}
              aria-expanded={open}
            >
              <span className="row__chevron">
                <Icon name="chevron" size={13} />
              </span>
              <span className="row__name">{child.name}</span>
            </button>
            {open && (
              <DirBody
                dir={child}
                depth={depth + 1}
                expanded={expanded}
                toggleDir={toggleDir}
                activePath={activePath}
                onSelect={onSelect}
                showAllFiles={showAllFiles}
              />
            )}
          </div>
        )
      })}
      {files.map((file) => (
        <button
          key={file.path}
          className="row row--file"
          style={{ paddingLeft: 10 + depth * 12 + 17 }}
          aria-current={file.path === activePath ? 'page' : undefined}
          onClick={() => onSelect(file.path)}
        >
          <Icon name={iconFor(file.kind)} size={14} />
          <span className="row__name">{file.name}</span>
        </button>
      ))}
    </>
  )
}
