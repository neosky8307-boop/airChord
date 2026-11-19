import { FINGER_NAMES, type FingerName, type FingerVector } from '../hand/fingers'
import type { Handedness } from '../hand/types'

/** 손 가이드 SVG의 좌표계 */
export const GUIDE_VIEWBOX = { width: 100, height: 120 } as const
export const PALM = { x: 22, y: 66, width: 56, height: 46, radius: 14 } as const

export interface FingerShape {
  name: FingerName
  /** 손가락 뿌리 위치 (회전 중심) */
  x: number
  y: number
  /** 뿌리에서 손끝까지 길이 */
  length: number
  width: number
  /** 위쪽 기준 시계방향 회전 각도(도) */
  angle: number
  /** 0~1로 보정된 펴짐 정도 */
  ext: number
}

interface FingerSpec {
  x: number
  y: number
  /** 접었을 때/폈을 때 길이 */
  min: number
  max: number
  width: number
  /** 접었을 때/폈을 때 각도 (엄지만 각도가 변한다) */
  angleCurled: number
  angleOpen: number
}

/** 엄지가 오른쪽에 있는 배치. 왼쪽 배치는 렌더링 때 좌우로 뒤집는다. */
const SPECS: Record<FingerName, FingerSpec> = {
  thumb: { x: 74, y: 98, min: 16, max: 30, width: 12, angleCurled: -75, angleOpen: 50 },
  index: { x: 68, y: PALM.y, min: 10, max: 38, width: 11, angleCurled: 0, angleOpen: 0 },
  middle: { x: 55, y: PALM.y, min: 10, max: 44, width: 11, angleCurled: 0, angleOpen: 0 },
  ring: { x: 42, y: PALM.y, min: 10, max: 40, width: 11, angleCurled: 0, angleOpen: 0 },
  pinky: { x: 29, y: PALM.y, min: 10, max: 30, width: 11, angleCurled: 0, angleOpen: 0 },
}

const clamp01 = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0)

/** 템플릿(손가락 5개 펴짐값)으로 가이드 손의 모양을 계산한다. 순서는 FINGER_NAMES와 같다. */
export function handGuideShapes(template: FingerVector): FingerShape[] {
  return FINGER_NAMES.map((name, i) => {
    const s = SPECS[name]
    const ext = clamp01(template[i])
    return {
      name,
      x: s.x,
      y: s.y,
      length: s.min + (s.max - s.min) * ext,
      width: s.width,
      angle: s.angleCurled + (s.angleOpen - s.angleCurled) * ext,
      ext,
    }
  })
}

/**
 * 사용자가 화면에서 보는 모습과 같은 손 방향으로 그리기 위해, 엄지가 오른쪽에 오는지 계산한다.
 * 왼손을 손바닥이 카메라를 향하게 들면 카메라 원본에서는 엄지가 왼쪽, 거울(반전) 표시에서는 오른쪽에 보인다.
 */
export function thumbOnRight(chordHand: Handedness, mirror: boolean): boolean {
  return (chordHand === 'Left') === mirror
}

/** 코드 이름에서 옥타브를 뗀 음 이름들. 예: ['C4','E4','G4'] → 'C E G' */
export function noteNames(notes: string[]): string {
  return notes.map((n) => n.replace(/\d+$/, '')).join(' ')
}
