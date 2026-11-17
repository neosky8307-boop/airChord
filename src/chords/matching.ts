import type { FingerVector } from '../hand/fingers'
import type { Templates } from './definitions'

export interface Match {
  id: string
  /** 템플릿과의 유클리드 거리 (작을수록 비슷) */
  distance: number
  /** 0~1. 거리가 0이면 1, 임계값에 닿으면 0 */
  confidence: number
}

export function euclidean(a: readonly number[], b: readonly number[]): number {
  let sum = 0
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2
  return Math.sqrt(sum)
}

/** 가장 가까운 템플릿을 찾고, 거리가 threshold 이하일 때만 인식한다. */
export function matchChord(
  fingers: FingerVector,
  templates: Templates,
  threshold: number,
): Match | null {
  let best: Match | null = null
  for (const [id, template] of Object.entries(templates)) {
    const distance = euclidean(fingers, template)
    if (!best || distance < best.distance) best = { id, distance, confidence: 0 }
  }
  if (!best || best.distance > threshold) return null
  best.confidence = threshold === 0 ? 1 : 1 - best.distance / threshold
  return best
}

/**
 * 떨림 방지: 같은 후보가 n프레임 연속일 때만 확정값을 바꾼다.
 * 손이 사라지거나 인식 실패(null)도 n프레임 연속이면 "없음"으로 확정된다.
 */
export class Stabilizer {
  private candidate: string | null = null
  private count = 0
  private confirmed: string | null = null

  constructor(public frames: number) {}

  /** 프레임마다 호출. 확정값이 바뀐 프레임에서만 changed가 true. */
  push(id: string | null): { confirmed: string | null; changed: boolean } {
    if (id === this.candidate) this.count++
    else {
      this.candidate = id
      this.count = 1
    }
    let changed = false
    if (this.candidate !== this.confirmed && this.count >= this.frames) {
      this.confirmed = this.candidate
      changed = true
    }
    return { confirmed: this.confirmed, changed }
  }

  reset() {
    this.candidate = null
    this.count = 0
    this.confirmed = null
  }
}
