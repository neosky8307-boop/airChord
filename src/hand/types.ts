/** 정규화 좌표 (x,y: 0~1, z: 상대 깊이). UI/플랫폼에 의존하지 않는 순수 타입. */
export interface Landmark {
  x: number
  y: number
  z: number
}

export type Handedness = 'Left' | 'Right'

export interface Hand {
  landmarks: Landmark[] // 21개
  handedness: Handedness
  score: number
}

export interface HandFrame {
  hands: Hand[]
  /** 추론에 사용한 프레임 시각 (performance.now 기준, ms) */
  timestamp: number
}
