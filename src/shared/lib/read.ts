import type { FileNode, LoadedDoc } from '@/entities/document'
import { MAX_READ_BYTES } from '@/shared/config/constants'
import { decodeBuffer } from './decode'

export class FileTooLargeError extends Error {
  constructor(public size: number) {
    super(`file too large: ${size}`)
  }
}

async function getFile(node: FileNode): Promise<File> {
  if (node.handle) return node.handle.getFile()
  if (node.file) return node.file
  throw new Error(`no accessor for ${node.path}`)
}

export interface FileMeta {
  size: number
  lastModified: number
}

/** 내용을 읽지 않고 크기·수정 시각만 확인한다. 못 여는 형식의 안내에 쓴다. */
export async function readMeta(node: FileNode): Promise<FileMeta> {
  const file = await getFile(node)
  return { size: file.size, lastModified: file.lastModified }
}

export async function readDoc(node: FileNode): Promise<LoadedDoc> {
  const file = await getFile(node)
  if (file.size > MAX_READ_BYTES) throw new FileTooLargeError(file.size)
  const { text, encoding } = decodeBuffer(await file.arrayBuffer())
  return {
    path: node.path,
    name: node.name,
    kind: node.kind,
    text,
    encoding,
    size: file.size,
    lastModified: file.lastModified,
  }
}
