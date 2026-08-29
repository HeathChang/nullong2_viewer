export interface SearchTarget {
  path: string
  name: string
  handle?: FileSystemFileHandle
  file?: File
}

export interface SearchHit {
  path: string
  /** 1부터 시작하는 줄 번호 */
  line: number
  /** 일치가 포함된 줄. 너무 길면 앞뒤를 잘라 낸다. */
  text: string
  /** text 안에서 일치가 시작하는 위치 */
  col: number
  length: number
}

export interface SearchRequest {
  id: number
  query: string
  targets: SearchTarget[]
}

export interface SearchUpdate {
  id: number
  scanned: number
  total: number
  hits: SearchHit[]
  files: number
  done: boolean
  /** 결과 상한에 걸려 도중에 멈췄는가 */
  truncated: boolean
  /** 크기·형식 때문에 건너뛴 파일 수 */
  skipped: number
}

export const MAX_HITS = 400
export const MAX_HITS_PER_FILE = 8
/** 이보다 큰 파일은 훑지 않는다. 전체 검색이 폴더 하나를 통째로 메모리에 올리면 안 된다. */
export const MAX_SEARCH_BYTES = 2 * 1024 * 1024
export const MIN_QUERY = 2
