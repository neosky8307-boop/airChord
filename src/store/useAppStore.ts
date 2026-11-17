import { create } from 'zustand'
import { DEFAULT_TEMPLATES, type Templates } from '../chords/definitions'
import { browserStorage, loadTemplates, saveTemplates } from '../chords/storage'
import type { FingerVector } from '../hand/fingers'
import {
  clampNumeric,
  DEFAULT_SETTINGS,
  loadSettings,
  NUMERIC_RANGES,
  saveSettings,
  type NumericSettingKey,
  type Settings,
} from '../settings/settings'

export type Status = 'idle' | 'loading' | 'running' | 'error'
export type Mode = 'chord' | 'strum' | 'piano'

const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]

/** 상태에서 저장 대상 설정만 뽑는다. */
function pickSettings(s: Settings): Settings {
  const out = {} as Record<string, unknown>
  for (const k of SETTING_KEYS) out[k] = s[k]
  return out as unknown as Settings
}

/** Settings(mirror, chordHand, threshold, stableFrames, 감도들, cameraId)는 상태에 평평하게 들어 있다. */
interface AppState extends Settings {
  status: Status
  error: string | null
  fps: number
  handCount: number
  mode: Mode
  setMode: (mode: Mode) => void
  /** 설정 하나를 바꾸고 저장한다. 숫자는 허용 범위로 보정된다. */
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  resetSettings: () => void
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
}

export const useAppStore = create<AppState>((set) => ({
  ...loadSettings(browserStorage()),
  status: 'idle',
  error: null,
  fps: 0,
  handCount: 0,
  mode: 'chord',
  setMode: (mode) => set({ mode }),
  setSetting: (key, value) =>
    set((s) => {
      const v = key in NUMERIC_RANGES ? clampNumeric(key as NumericSettingKey, value as number) : value
      const next = { ...pickSettings(s), [key]: v } as Settings
      saveSettings(browserStorage(), next)
      return { [key]: v } as Partial<AppState>
    }),
  resetSettings: () =>
    set(() => {
      const defaults = { ...DEFAULT_SETTINGS }
      saveSettings(browserStorage(), defaults)
      return defaults
    }),
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
}))
