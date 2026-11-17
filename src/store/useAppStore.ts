import { create } from 'zustand'
import { DEFAULT_TEMPLATES, type Templates } from '../chords/definitions'
import { browserStorage, loadTemplates, saveTemplates } from '../chords/storage'
import type { FingerVector } from '../hand/fingers'
import type { Handedness } from '../hand/types'

export type Status = 'idle' | 'loading' | 'running' | 'error'
export type Mode = 'chord' | 'strum' | 'piano'

interface AppState {
  status: Status
  error: string | null
  fps: number
  handCount: number
  mirror: boolean
  mode: Mode
  setMode: (mode: Mode) => void
  /** 스트럼 판정 속도 (손길이/초). 작을수록 살살 쳐도 울린다. */
  strumThreshold: number
  /** 에어 피아노: 손끝 하강 속도 임계값 (손길이/초) */
  pianoPressSpeed: number
  /** 에어 피아노: 손가락 굽힘 속도 임계값 (펴짐값/초) */
  pianoBendSpeed: number
  /** 코드 손모양을 읽는 손 (반대 손은 스트럼/연주용) */
  chordHand: Handedness
  /** 코드 인식 임계값 (유클리드 거리) */
  threshold: number
  /** 확정에 필요한 연속 프레임 수 */
  stableFrames: number
  templates: Templates
  /** 안정화를 거쳐 확정된 코드 (없으면 null) */
  confirmedChord: string | null
  setConfirmedChord: (id: string | null) => void
  /** 녹화 중인 코드 id (없으면 null) */
  calibrating: string | null
  calibrationMessage: string | null
  setCalibrating: (id: string | null, message?: string | null) => void
  setTemplate: (id: string, template: FingerVector) => void
  resetTemplate: (id: string) => void
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
  mode: 'chord',
  setMode: (mode) => set({ mode }),
  strumThreshold: 3,
  pianoPressSpeed: 2.5,
  pianoBendSpeed: 2,
  chordHand: 'Left',
  threshold: 0.8,
  stableFrames: 4,
  templates: loadTemplates(browserStorage()),
  confirmedChord: null,
  setConfirmedChord: (confirmedChord) => set({ confirmedChord }),
  calibrating: null,
  calibrationMessage: null,
  setCalibrating: (calibrating, message = null) => set({ calibrating, calibrationMessage: message }),
  setTemplate: (id, template) =>
    set((s) => {
      const templates = { ...s.templates, [id]: template }
      saveTemplates(browserStorage(), templates)
      return { templates }
    }),
  resetTemplate: (id) =>
    set((s) => {
      const templates = { ...s.templates, [id]: DEFAULT_TEMPLATES[id] }
      saveTemplates(browserStorage(), templates)
      return { templates }
    }),
  setStatus: (status, error = null) => set({ status, error }),
  setStats: (fps, handCount) => set({ fps, handCount }),
  setMirror: (mirror) => set({ mirror }),
}))
