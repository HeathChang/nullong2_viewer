import { create } from 'zustand'

interface UiState {
  sidebarOpen: boolean
  paletteOpen: boolean
  settingsOpen: boolean
  shortcutsOpen: boolean
  findOpen: boolean
  toggleSidebar: () => void
  setPalette: (open: boolean) => void
  setSettings: (open: boolean) => void
  setShortcuts: (open: boolean) => void
  setFind: (open: boolean) => void
  closeOverlays: () => boolean
}

export const useUi = create<UiState>((set, get) => ({
  sidebarOpen: true,
  paletteOpen: false,
  settingsOpen: false,
  shortcutsOpen: false,
  findOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setPalette: (paletteOpen) => set({ paletteOpen }),
  setSettings: (settingsOpen) => set({ settingsOpen }),
  setShortcuts: (shortcutsOpen) => set({ shortcutsOpen }),
  setFind: (findOpen) => set({ findOpen }),

  /** 열려 있던 패널을 하나 닫는다. 닫을 게 있었으면 true. */
  closeOverlays: () => {
    const { paletteOpen, settingsOpen, shortcutsOpen, findOpen } = get()
    if (paletteOpen) set({ paletteOpen: false })
    else if (settingsOpen) set({ settingsOpen: false })
    else if (shortcutsOpen) set({ shortcutsOpen: false })
    else if (findOpen) set({ findOpen: false })
    else return false
    return true
  },
}))
