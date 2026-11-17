import { create } from 'zustand'

export type Status = 'idle' | 'loading' | 'running' | 'error'

interface AppState {
  status: Status
  error: string | null
  fps: number
  handCount: number
  mirror: boolean
  setStatus: (status: Status, error?: string | null) => void
  setStats: (fps: number, handCount: number) => void
  setMirror: (mirror: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  status: 'idle',
  error: null,
  fps: 0,
  handCount: 0,
  mirror: true,
  setStatus: (status, error = null) => set({ status, error }),
  setStats: (fps, handCount) => set({ fps, handCount }),
  setMirror: (mirror) => set({ mirror }),
}))
