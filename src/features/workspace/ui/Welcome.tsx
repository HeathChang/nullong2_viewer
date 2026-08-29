import { useEffect, useRef } from 'react'
import { useT } from '@/shared/i18n/useT'
import { Icon } from '@/shared/ui/Icon'
import { useWorkspace } from '../model/store'
import { RecentList } from './RecentList'

const SUPPORTED = typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function'

export function Welcome({ dragging }: { dragging: boolean }) {
  const t = useT()
  const refreshRecents = useWorkspace((s) => s.refreshRecents)
  const pickDirectory = useWorkspace((s) => s.pickDirectory)
  const openSnapshot = useWorkspace((s) => s.openSnapshot)
  const openStatus = useWorkspace((s) => s.openStatus)
  const scanCount = useWorkspace((s) => s.scanCount)
  const openError = useWorkspace((s) => s.openError)
  const dirInput = useRef<HTMLInputElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void refreshRecents()
  }, [refreshRecents])

  function takeFiles(list: FileList | null, useRelativePath: boolean) {
    if (!list || list.length === 0) return
    openSnapshot(
      Array.from(list).map((file) => ({
        file,
        path: useRelativePath ? file.webkitRelativePath || file.name : file.name,
      })),
    )
  }

  return (
    <div className={`welcome${dragging ? ' welcome--drop' : ''}`}>
      <div className="welcome__inner">
        <p className="welcome__brand">{t('app.title')}</p>
        <h1 className="welcome__headline">{t('open.headline')}</h1>
        <p className="welcome__lede">{t('open.lede')}</p>

        {openStatus === 'scanning' ? (
          <p className="welcome__scanning">{t('open.scanning', { n: scanCount })}</p>
        ) : (
          <div className="welcome__actions">
            <button
              className="btn btn--primary"
              onClick={() => (SUPPORTED ? void pickDirectory() : dirInput.current?.click())}
            >
              <Icon name="folder" /> {SUPPORTED ? t('open.folder') : t('open.folderFallback')}
            </button>
            <button className="btn" onClick={() => fileInput.current?.click()}>
              <Icon name="doc" /> {t('open.files')}
            </button>
          </div>
        )}

        {!SUPPORTED && <p className="welcome__note">{t('open.noSupport')}</p>}
        {openError && (
          <p className="welcome__error">
            {openError === 'denied' ? t('open.denied') : t('open.failed')}
          </p>
        )}

        <p className={`welcome__drop${dragging ? ' is-active' : ''}`}>
          {dragging ? t('open.dropActive') : t('open.drop')}
        </p>

        <RecentList />

        <p className="welcome__privacy">{t('open.privacy')}</p>
        <p className="welcome__skipped">{t('sidebar.skipped')}</p>
      </div>

      <input
        ref={dirInput}
        type="file"
        hidden
        multiple
        // React 타입에는 없지만 Chromium·Firefox·Safari 가 모두 지원하는 폴더 선택 속성
        {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
        onChange={(event) => {
          takeFiles(event.target.files, true)
          event.target.value = ''
        }}
      />
      <input
        ref={fileInput}
        type="file"
        hidden
        multiple
        onChange={(event) => {
          takeFiles(event.target.files, false)
          event.target.value = ''
        }}
      />
    </div>
  )
}
