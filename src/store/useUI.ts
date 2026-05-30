/** Small store for transient UI chrome (modals/sheets) shared across the app. */
import { create } from 'zustand'

interface UIState {
  helpOpen: boolean
  openHelp: () => void
  closeHelp: () => void
}

export const useUI = create<UIState>((set) => ({
  helpOpen: false,
  openHelp: () => set({ helpOpen: true }),
  closeHelp: () => set({ helpOpen: false }),
}))
