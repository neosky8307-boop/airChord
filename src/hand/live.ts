import type { FingerVector } from './fingers'
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
} = { fingers: {}, match: null, latencyMs: null }
