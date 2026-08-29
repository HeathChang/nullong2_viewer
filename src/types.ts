export type FileKind = 'markdown' | 'json' | 'jsonl' | 'yaml' | 'text'

export interface FileNode {
  /** 워크스페이스 루트 기준 상대 경로. 트리 전체에서 고유하다. */
  path: string
  name: string
  kind: FileKind
  size: number
  lastModified: number
  handle?: FileSystemFileHandle
  /** File System Access API 를 못 쓰는 브라우저용 스냅샷 */
  file?: File
}

export interface DirNode {
  path: string
  name: string
  dirs: DirNode[]
  files: FileNode[]
}

export type WorkspaceMode = 'fsaccess' | 'snapshot'

export interface Workspace {
  name: string
  mode: WorkspaceMode
  root: DirNode
  files: FileNode[]
  /** 스캔이 상한에 걸려 잘렸는지 */
  truncated: boolean
  handle?: FileSystemDirectoryHandle
}

export interface LoadedDoc {
  path: string
  name: string
  kind: FileKind
  text: string
  encoding: string
  size: number
  lastModified: number
}
