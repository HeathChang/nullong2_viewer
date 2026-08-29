export const IS_MAC =
  typeof navigator !== 'undefined' && /mac/i.test(navigator.platform || navigator.userAgent)

export const MOD_LABEL = IS_MAC ? '⌘' : 'Ctrl'
export const PALETTE_HINT = IS_MAC ? '⌘K' : 'Ctrl+K'
