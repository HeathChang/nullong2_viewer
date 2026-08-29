import type { FileNode, LoadedDoc } from '../types'
import { decodeBuffer } from './decode'

export const MAX_READ_BYTES = 64 * 1024 * 1024

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

/** 열려 있는 파일이 디스크에서 바뀌었는지 확인한다(창 포커스 시 폴링). */
export async function hasChanged(node: FileNode, knownLastModified: number): Promise<boolean> {
  if (!node.handle) return false
  try {
    const file = await node.handle.getFile()
    return file.lastModified !== knownLastModified
  } catch {
    return false
  }
}
