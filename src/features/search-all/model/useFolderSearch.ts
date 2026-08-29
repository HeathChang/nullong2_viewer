import { useCallback, useEffect, useRef, useState } from 'react'
import type { FileNode } from '@/entities/document'
import { isOpenable } from '@/entities/document'
import { MIN_QUERY, type SearchRequest, type SearchUpdate } from './types'

const EMPTY: SearchUpdate = {
  id: 0,
  scanned: 0,
  total: 0,
  hits: [],
  files: 0,
  done: true,
  truncated: false,
  skipped: 0,
}

export function useFolderSearch(files: FileNode[]) {
  const workerRef = useRef<Worker | null>(null)
  const requestId = useRef(0)
  const [result, setResult] = useState<SearchUpdate>(EMPTY)
  const [query, setQuery] = useState('')

  // 워커는 첫 검색 때 만든다. 검색을 한 번도 안 쓰는 사람에게 스레드를 띄우지 않는다.
  const ensureWorker = useCallback(() => {
    if (workerRef.current) return workerRef.current
    const worker = new Worker(new URL('./search.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (event: MessageEvent<SearchUpdate>) => {
      // 지난 검색의 뒤늦은 응답은 버린다.
      if (event.data.id === requestId.current) setResult(event.data)
    }
    workerRef.current = worker
    return worker
  }, [])

  useEffect(
    () => () => {
      workerRef.current?.terminate()
      workerRef.current = null
    },
    [],
  )

  const run = useCallback(
    (next: string) => {
      setQuery(next)
      const trimmed = next.trim()
      requestId.current += 1
      if (trimmed.length < MIN_QUERY) {
        setResult({ ...EMPTY, id: requestId.current })
        return
      }
      // 못 여는 형식(이미지·바이너리)은 훑을 이유가 없다.
      const targets = files
        .filter((file) => isOpenable(file.kind))
        .map((file) => ({ path: file.path, name: file.name, handle: file.handle, file: file.file }))

      setResult({ ...EMPTY, id: requestId.current, total: targets.length, done: false })
      const request: SearchRequest = { id: requestId.current, query: trimmed, targets }
      ensureWorker().postMessage(request)
    },
    [files, ensureWorker],
  )

  const reset = useCallback(() => {
    requestId.current += 1
    setQuery('')
    setResult({ ...EMPTY, id: requestId.current })
  }, [])

  return { query, run, reset, result }
}
