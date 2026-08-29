/** 읽을 이유가 거의 없고 파일 수만 폭증시키는 디렉토리. 스캔 자체를 건너뛴다. */
export const IGNORED_DIRS = [
  'node_modules',
  '.git',
  '.svn',
  '.hg',
  'dist',
  'build',
  'out',
  '.next',
  '.nuxt',
  '.svelte-kit',
  '.turbo',
  '.cache',
  '.parcel-cache',
  'coverage',
  '.nyc_output',
  'vendor',
  'target',
  '.venv',
  'venv',
  '__pycache__',
  '.mypy_cache',
  '.pytest_cache',
  '.gradle',
  'Pods',
  '.terraform',
] as const

export const IGNORED_DIR_SET: ReadonlySet<string> = new Set(IGNORED_DIRS)

export const MAX_FILES = 20_000
export const MAX_DEPTH = 16
export const MAX_READ_BYTES = 64 * 1024 * 1024
