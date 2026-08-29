import { useApp } from '../state/store'
import { useT } from '../i18n/useT'
import { Icon } from './Icon'
import { FONT_SIZE_RANGE, LINE_HEIGHT_RANGE, WIDTH_RANGE } from '../state/prefs'
import { LANG_LABELS, type LangCode } from '../i18n'
import type { MsgKey } from '../i18n/ko'

const THEMES = ['system', 'light', 'dark'] as const
const FONTS = ['sans', 'serif', 'mono'] as const

export function SettingsPanel() {
  const t = useT()
  const open = useApp((s) => s.settingsOpen)
  const setSettings = useApp((s) => s.setSettings)
  const prefs = useApp((s) => s.prefs)
  const setPref = useApp((s) => s.setPref)
  const resetPrefs = useApp((s) => s.resetPrefs)

  if (!open) return null

  return (
    <div className="overlay overlay--right" onMouseDown={() => setSettings(false)}>
      <aside
        className="panel"
        role="dialog"
        aria-modal="true"
        aria-label={t('settings.title')}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="panel__head">
          <h2>{t('settings.title')}</h2>
          <button className="iconbtn" onClick={() => setSettings(false)} aria-label={t('common.close')}>
            <Icon name="close" />
          </button>
        </header>

        <div className="panel__body">
          <Field label={t('settings.theme')}>
            <div className="segmented">
              {THEMES.map((theme) => (
                <button
                  key={theme}
                  className={prefs.theme === theme ? 'is-on' : ''}
                  onClick={() => setPref('theme', theme)}
                >
                  {t(`settings.theme.${theme}` as MsgKey)}
                </button>
              ))}
            </div>
          </Field>

          <Field label={t('settings.font')}>
            <div className="segmented">
              {FONTS.map((font) => (
                <button
                  key={font}
                  className={prefs.font === font ? 'is-on' : ''}
                  style={{ fontFamily: `var(--font-${font})` }}
                  onClick={() => setPref('font', font)}
                >
                  {t(`settings.font.${font}` as MsgKey)}
                </button>
              ))}
            </div>
          </Field>

          <Slider
            label={t('settings.fontSize')}
            value={prefs.fontSize}
            min={FONT_SIZE_RANGE[0]}
            max={FONT_SIZE_RANGE[1]}
            step={1}
            display={`${prefs.fontSize}px`}
            onChange={(value) => setPref('fontSize', value)}
          />
          <Slider
            label={t('settings.width')}
            value={prefs.width}
            min={WIDTH_RANGE[0]}
            max={WIDTH_RANGE[1]}
            step={2}
            display={`${prefs.width}ch`}
            onChange={(value) => setPref('width', value)}
          />
          <Slider
            label={t('settings.lineHeight')}
            value={prefs.lineHeight}
            min={LINE_HEIGHT_RANGE[0]}
            max={LINE_HEIGHT_RANGE[1]}
            step={0.02}
            display={prefs.lineHeight.toFixed(2)}
            onChange={(value) => setPref('lineHeight', Number(value.toFixed(2)))}
          />

          <Field label={t('settings.language')}>
            <div className="segmented">
              {(Object.keys(LANG_LABELS) as LangCode[]).map((code) => (
                <button
                  key={code}
                  className={prefs.lang === code ? 'is-on' : ''}
                  onClick={() => setPref('lang', code)}
                >
                  {LANG_LABELS[code]}
                </button>
              ))}
            </div>
          </Field>

          <label className="check">
            <input
              type="checkbox"
              checked={prefs.wrapCode}
              onChange={(event) => setPref('wrapCode', event.target.checked)}
            />
            <span>{t('settings.wrapCode')}</span>
          </label>

          <label className="check">
            <input
              type="checkbox"
              checked={prefs.includeHidden}
              onChange={(event) => setPref('includeHidden', event.target.checked)}
            />
            <span>{t('settings.hidden')}</span>
          </label>
          <p className="panel__note">{t('settings.hiddenNote')}</p>

          <button className="btn btn--ghost" onClick={resetPrefs}>
            {t('settings.reset')}
          </button>
        </div>
      </aside>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <span className="field__label">{label}</span>
      {children}
    </div>
  )
}

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  display: string
  onChange: (value: number) => void
}

function Slider({ label, value, min, max, step, display, onChange }: SliderProps) {
  return (
    <div className="field">
      <span className="field__label">
        {label}
        <b>{display}</b>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  )
}
