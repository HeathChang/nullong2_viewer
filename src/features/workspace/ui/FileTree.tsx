import { useEffect, useRef, useState } from 'react'
import type { DirNode, FileKind } from '@/entities/document'
import { isOpenable } from '@/entities/document'
import { Icon, type IconName } from '@/shared/ui/Icon'

export function iconFor(kind: FileKind): IconName {
  if (kind === 'json' || kind === 'jsonl' || kind === 'yaml') return 'braces'
  if (kind === 'other') return 'blank'
  return 'doc'
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

interface Props {
  root: DirNode
  /**
   * 펼침 상태를 되돌릴 기준. 필터를 바꾸면 root 객체가 새로 만들어지므로
   * 그걸 기준으로 삼으면 칩 하나 누를 때마다 펼쳐 둔 폴더가 접혀 버린다.
   */
  resetKey: unknown
  activePath: string | null
  onSelect: (path: string) => void
}

export function FileTree({ root, resetKey, activePath, onSelect }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const hostRef = useRef<HTMLDivElement>(null)

  // 폴더를 열면 최상위 폴더는 펼쳐 둔다. 트리가 처음부터 쓸모 있어야 한다.
  useEffect(() => {
    setExpanded(new Set(root.dirs.map((dir) => dir.path)))
    // root 는 필터에 따라 매번 새 객체가 된다. 워크스페이스가 바뀔 때만 되돌린다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey])

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
    hostRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest' })
  }, [activePath])

  function toggle(path: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  return (
    <div ref={hostRef} className="tree__body">
      <Level dir={root} depth={0} expanded={expanded} toggle={toggle} activePath={activePath} onSelect={onSelect} />
    </div>
  )
}

interface LevelProps {
  dir: DirNode
  depth: number
  expanded: Set<string>
  toggle: (path: string) => void
  activePath: string | null
  onSelect: (path: string) => void
}

function Level({ dir, depth, expanded, toggle, activePath, onSelect }: LevelProps) {
  return (
    <>
      {dir.dirs.map((child) => {
        const open = expanded.has(child.path)
        return (
          <div key={child.path}>
            <button
              className={`row row--dir${open ? ' is-open' : ''}`}
              style={{ paddingLeft: 10 + depth * 12 }}
              onClick={() => toggle(child.path)}
              aria-expanded={open}
            >
              <span className="row__chevron">
                <Icon name="chevron" size={13} />
              </span>
              <span className="row__name">{child.name}</span>
            </button>
            {open && (
              <Level
                dir={child}
                depth={depth + 1}
                expanded={expanded}
                toggle={toggle}
                activePath={activePath}
                onSelect={onSelect}
              />
            )}
          </div>
        )
      })}
      {dir.files.map((file) => (
        <button
          key={file.path}
          className={`row row--file${isOpenable(file.kind) ? '' : ' row--muted'}`}
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
