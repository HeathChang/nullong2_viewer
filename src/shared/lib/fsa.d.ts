/**
 * File System Access API 중 TypeScript 기본 lib.dom 에 아직 없는 부분.
 */
type FsaPermissionState = 'granted' | 'denied' | 'prompt'

interface FileSystemHandlePermissionDescriptor {
  mode?: 'read' | 'readwrite'
}

interface FileSystemHandle {
  queryPermission?(descriptor?: FileSystemHandlePermissionDescriptor): Promise<FsaPermissionState>
  requestPermission?(descriptor?: FileSystemHandlePermissionDescriptor): Promise<FsaPermissionState>
}

interface FileSystemDirectoryHandle {
  values(): AsyncIterableIterator<FileSystemHandle>
  keys(): AsyncIterableIterator<string>
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>
}

interface DirectoryPickerOptions {
  id?: string
  mode?: 'read' | 'readwrite'
  startIn?: string | FileSystemHandle
}

interface OpenFilePickerOptions {
  id?: string
  multiple?: boolean
  excludeAcceptAllOption?: boolean
  types?: { description?: string; accept: Record<string, string[]> }[]
}

interface DataTransferItem {
  getAsFileSystemHandle?(): Promise<FileSystemHandle | null>
}

interface Window {
  showDirectoryPicker?(options?: DirectoryPickerOptions): Promise<FileSystemDirectoryHandle>
  showOpenFilePicker?(options?: OpenFilePickerOptions): Promise<FileSystemFileHandle[]>
}
