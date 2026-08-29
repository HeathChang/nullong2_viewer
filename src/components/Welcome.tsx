import { useEffect, useRef } from 'react'
import { useApp } from '../state/store'
import { useT } from '../i18n/useT'
import { Icon } from './Icon'

const SUPPORTED = typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function'

export function Welcome({ dragging }: { dragging: boolean }) {
  const t = useT()
  const {
    recents,
    refreshRecents,
    pickDirectory,
    openRecent,
    dropRecent,
    openSnapshot,
    openStatus,
    scanCount,
    openError,
  } = useApp()
  const dirInput = useRef<HTMLInputElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void refreshRecents()
  }, [refreshRecents])

  function takeFiles(list: FileList | null, useRelativePath: boolean) {
    if (!list || list.length === 0) return
    const entries = Array.from(list).map((file) => ({
      file,
      path: useRelativePath ? file.webkitRelativePath || file.name : file.name,
    }))
    openSnapshot(entries)
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
            {SUPPORTED ? (
              <button className="btn btn--primary" onClick={() => void pickDirectory()}>
                <Icon name="folder" /> {t('open.folder')}
              </button>
            ) : (
              <button className="btn btn--primary" onClick={() => dirInput.current?.click()}>
                <Icon name="folder" /> {t('open.folderFallback')}
              </button>
            )}
            <button className="btn" onClick={() => fileInput.current?.click()}>
              <Icon name="doc" /> {t('open.files')}
            </button>
          </div>
        )}

        {!SUPPORTED && <p className="welcome__note">{t('open.noSupport')}</p>}
        {openError && <p className="welcome__error">{t('open.failed')}</p>}

        <p className={`welcome__drop${dragging ? ' is-active' : ''}`}>
          {dragging ? t('open.dropActive') : t('open.drop')}
        </p>

        {recents.length > 0 && (
          <section className="recents">
            <h2 className="recents__title">{t('open.recent')}</h2>
            <ul className="recents__list">
              {recents.map((entry) => (
                <li key={entry.id}>
                  <button className="recents__open" onClick={() => void openRecent(entry)}>
                    <Icon name="folder" />
                    <span className="recents__name">{entry.name}</span>
                    <span className="recents__when">
                      {new Intl.DateTimeFormat(undefined, {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      }).format(entry.openedAt)}
                    </span>
                  </button>
                  <button
                    className="recents__forget"
                    title={t('open.forget')}
                    aria-label={t('open.forget')}
                    onClick={() => void dropRecent(entry.id)}
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="welcome__privacy">{t('open.privacy')}</p>
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
        accept=".md,.markdown,.mdx,.json,.jsonc,.jsonl,.ndjson,.yaml,.yml,.txt,.log"
        onChange={(event) => {
          takeFiles(event.target.files, false)
          event.target.value = ''
        }}
      />
    </div>
  )
}
