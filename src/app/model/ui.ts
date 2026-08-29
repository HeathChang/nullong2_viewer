import { create } from 'zustand'

interface UiState {
  sidebarOpen: boolean
  paletteOpen: boolean
  settingsOpen: boolean
  shortcutsOpen: boolean
  toggleSidebar: () => void
  setPalette: (open: boolean) => void
  setSettings: (open: boolean) => void
  setShortcuts: (open: boolean) => void
  closeOverlays: () => boolean
}

export const useUi = create<UiState>((set, get) => ({
  sidebarOpen: true,
  paletteOpen: false,
  settingsOpen: false,
  shortcutsOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setPalette: (paletteOpen) => set({ paletteOpen }),
  setSettings: (settingsOpen) => set({ settingsOpen }),
  setShortcuts: (shortcutsOpen) => set({ shortcutsOpen }),

  /** 열려 있던 패널을 하나 닫는다. 닫을 게 있었으면 true. */
  closeOverlays: () => {
    const { paletteOpen, settingsOpen, shortcutsOpen } = get()
    if (paletteOpen) set({ paletteOpen: false })
    else if (settingsOpen) set({ settingsOpen: false })
    else if (shortcutsOpen) set({ shortcutsOpen: false })
    else return false
    return true
  },
}))
