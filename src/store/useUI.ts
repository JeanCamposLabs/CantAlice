/** Small store for transient UI chrome (modals/sheets, celebrations). */
import { create } from 'zustand'

interface UIState {
  helpOpen: boolean
  openHelp: () => void
  closeHelp: () => void

  requestAccessOpen: boolean
  openRequestAccess: () => void
  closeRequestAccess: () => void

  /** A celebratory message shown with confetti, or null. */
  celebration: string | null
  celebrate: (message: string) => void
  clearCelebration: () => void
}

export const useUI = create<UIState>((set) => ({
  helpOpen: false,
  openHelp: () => set({ helpOpen: true }),
  closeHelp: () => set({ helpOpen: false }),

  requestAccessOpen: false,
  openRequestAccess: () => set({ requestAccessOpen: true }),
  closeRequestAccess: () => set({ requestAccessOpen: false }),

  celebration: null,
  celebrate: (message) => set({ celebration: message }),
  clearCelebration: () => set({ celebration: null }),
}))
