const PATHS = {
  folder: 'M3 6.5A1.5 1.5 0 0 1 4.5 5h3.4c.4 0 .8.2 1.1.5l1 1h6.5A1.5 1.5 0 0 1 18 8v8.5a1.5 1.5 0 0 1-1.5 1.5h-12A1.5 1.5 0 0 1 3 16.5z',
  doc: 'M6 3h6l4 4v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z M12 3v4h4',
  braces: 'M8.5 4C6.8 4 6.5 5 6.5 6.4v1.7c0 1-.6 1.9-1.5 1.9 .9 0 1.5.9 1.5 1.9v1.7c0 1.4.3 2.4 2 2.4 M13.5 4c1.7 0 2 1 2 2.4v1.7c0 1 .6 1.9 1.5 1.9-.9 0-1.5.9-1.5 1.9v1.7c0 1.4-.3 2.4-2 2.4',
  chevron: 'M8 5l5 5-5 5',
  search: 'M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z M13.2 13.2 17 17',
  settings: 'M10 7.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6z M10 2.5v1.8 M10 15.7v1.8 M17.5 10h-1.8 M4.3 10H2.5 M15.3 4.7l-1.3 1.3 M6 14l-1.3 1.3 M15.3 15.3 14 14 M6 6 4.7 4.7',
  close: 'M5 5l10 10 M15 5 5 15',
  refresh: 'M16 6.5A7 7 0 1 0 17 10 M16 3v3.5h-3.5',
  copy: 'M7.5 7.5h7a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1z M12.5 7.5v-2a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2',
  check: 'M4.5 10.5 8 14l7.5-8',
  panel: 'M4 4.5h12a.5.5 0 0 1 .5.5v10a.5.5 0 0 1-.5.5H4a.5.5 0 0 1-.5-.5V5a.5.5 0 0 1 .5-.5z M8 4.5v11',
  keyboard: 'M3.5 5.5h13a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5V6a.5.5 0 0 1 .5-.5z M6 9h.01 M9 9h.01 M12 9h.01 M14.5 9h.01 M6.5 12h7',
  trash: 'M4.5 6h11 M8 6V4.5h4V6 M6 6l.6 10h6.8L14 6',
  plus: 'M10 4.5v11 M4.5 10h11',
  arrowLeft: 'M15 10H5 M9 6l-4 4 4 4',
  arrowRight: 'M5 10h10 M11 6l4 4-4 4',
  blank: 'M6 3h6l4 4v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z',
  chevronUp: 'M5 12.5l5-5 5 5',
  chevronDown: 'M5 7.5l5 5 5-5',
  list: 'M4 5.5h12 M4 10h8 M4 14.5h10',
  findText: 'M3.5 5h13 M3.5 9h7 M3.5 13h5 M12.6 13.1a2.9 2.9 0 1 0 0-5.8 2.9 2.9 0 0 0 0 5.8z M14.8 15.2 17 17.4',
} as const

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name].split(' M').map((segment, index) => (
        <path key={index} d={index === 0 ? segment : `M${segment}`} />
      ))}
    </svg>
  )
}
