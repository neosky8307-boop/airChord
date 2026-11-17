import type { Handedness } from '../hand/types'

export const SETTINGS_KEY = 'airchord.settings.v1'

export interface Settings {
  /** 화면 좌우 반전 표시 */
  mirror: boolean
  /** 코드 손모양을 읽는 손 (반대 손은 스트럼/연주용) */
  chordHand: Handedness
  /** 코드 인식 임계값 (유클리드 거리) */
  threshold: number
  /** 코드 확정에 필요한 연속 프레임 수 */
  stableFrames: number
  /** 스트럼 판정 속도 (손길이/초) */
  strumThreshold: number
  /** 에어 피아노: 손끝 하강 속도 (손길이/초) */
  pianoPressSpeed: number
  /** 에어 피아노: 손가락 굽힘 속도 (펴짐값/초) */
  pianoBendSpeed: number
  /** 선택한 카메라 deviceId (null이면 기본 카메라) */
  cameraId: string | null
}

export const DEFAULT_SETTINGS: Settings = {
  mirror: true,
  chordHand: 'Left',
  threshold: 0.8,
  stableFrames: 4,
  strumThreshold: 3,
  pianoPressSpeed: 2.5,
  pianoBendSpeed: 2,
  cameraId: null,
}

export type NumericSettingKey =
  | 'threshold'
  | 'stableFrames'
  | 'strumThreshold'
  | 'pianoPressSpeed'
  | 'pianoBendSpeed'

export interface NumericRange {
  label: string
  hint: string
  min: number
  max: number
  step: number
}

/** 슬라이더 범위. 저장값 검증과 UI가 같은 표를 쓴다. */
export const NUMERIC_RANGES: Record<NumericSettingKey, NumericRange> = {
  threshold: { label: '코드 인식 임계값', hint: '클수록 대충 만들어도 인식 (오인식 증가)', min: 0.2, max: 2, step: 0.05 },
  stableFrames: { label: '확정 연속 프레임', hint: '클수록 안정적이지만 반응이 느림', min: 1, max: 10, step: 1 },
  strumThreshold: { label: '스트럼 감도 (속도)', hint: '작을수록 살살 쳐도 울림', min: 1, max: 10, step: 0.5 },
  pianoPressSpeed: { label: '피아노 누름 속도', hint: '작을수록 살짝만 내려도 울림', min: 1, max: 8, step: 0.5 },
  pianoBendSpeed: { label: '피아노 굽힘 속도', hint: '작을수록 덜 접어도 울림', min: 0.5, max: 6, step: 0.5 },
}

export function clampNumeric(key: NumericSettingKey, value: number): number {
  const { min, max, step } = NUMERIC_RANGES[key]
  if (!Number.isFinite(value)) return DEFAULT_SETTINGS[key]
  const snapped = Math.round(value / step) * step
  // 부동소수점 오차(0.8500000001 등) 제거
  return Math.min(max, Math.max(min, Number(snapped.toFixed(4))))
}

/** 알 수 없는 입력을 안전한 Settings로. 잘못된 필드는 기본값으로 대체한다. */
export function sanitizeSettings(raw: unknown): Settings {
  const out: Settings = { ...DEFAULT_SETTINGS }
  if (typeof raw !== 'object' || raw === null) return out
  const r = raw as Record<string, unknown>
  if (typeof r.mirror === 'boolean') out.mirror = r.mirror
  if (r.chordHand === 'Left' || r.chordHand === 'Right') out.chordHand = r.chordHand
  if (typeof r.cameraId === 'string' && r.cameraId.length > 0) out.cameraId = r.cameraId
  for (const key of Object.keys(NUMERIC_RANGES) as NumericSettingKey[]) {
    const v = r[key]
    if (typeof v === 'number') out[key] = clampNumeric(key, v)
  }
  return out
}

type Reader = Pick<Storage, 'getItem'>
type Writer = Pick<Storage, 'setItem'>

export function loadSettings(storage: Reader | null): Settings {
  try {
    const raw = storage?.getItem(SETTINGS_KEY)
    return raw ? sanitizeSettings(JSON.parse(raw)) : { ...DEFAULT_SETTINGS }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(storage: Writer | null, settings: Settings): void {
  try {
    storage?.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // 용량 초과 / 비공개 모드 등: 저장은 포기하고 앱은 계속 동작
  }
}
