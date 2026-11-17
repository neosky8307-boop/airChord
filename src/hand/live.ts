import type { FingerVector } from './fingers'
import type { TemplateRecorder } from '../chords/calibration'
import type { StrumDirection } from '../chords/strum'
import type { Match } from '../chords/matching'
import type { Handedness } from './types'

/**
 * 프레임마다 바뀌는 값을 React state 밖에 두는 공유 버퍼.
 * 쓰는 쪽(rAF 루프)과 읽는 쪽(UI의 rAF)이 리렌더링 없이 주고받는다.
 */
export const live: {
  fingers: Partial<Record<Handedness, { ext: FingerVector; ratios: FingerVector }>>
  /** 이번 프레임의 순간 매칭 결과 (안정화 이전) */
  match: Match | null
  /** 마지막 코드 재생까지의 지연 (손모양 시작 프레임 → 소리 출력, ms) */
  latencyMs: number | null
  /** 진행 중인 캘리브레이션 녹화 */
  recorder: TemplateRecorder | null
  /** 스트럼 손목 속도(부호 포함, 손길이/초). 튜닝용 표시. */
  strumSpeed: number
  /** 에어 피아노: 건반별 마지막 누른 시각 (하이라이트용) */
  pressed: Record<string, number>
  lastNote: { note: string; at: number } | null
  /** 에어 피아노: 현재 손가락 최대 하강/굽힘 속도 (튜닝용) */
  pianoStats: { speed: number; bend: number }
  lastStrum: { direction: StrumDirection; at: number } | null
} = { fingers: {}, match: null, latencyMs: null, recorder: null, strumSpeed: 0, lastStrum: null, pressed: {}, lastNote: null, pianoStats: { speed: 0, bend: 0 } }
