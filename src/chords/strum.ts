import type { Landmark } from '../hand/types'

export type StrumDirection = 'down' | 'up'

export interface StrumEvent {
  direction: StrumDirection
  /** 손 크기 단위의 속도 (손길이/초) */
  speed: number
  /** 0.4~1. 빠를수록 세게 친 것으로 본다 (재생 velocity에 사용) */
  strength: number
}

export interface StrumOptions {
  /** 이 속도 이상이면 스트로크로 판정 (손길이/초) */
  triggerSpeed?: number
  /** 한 번 판정 후, 속도가 이 값 아래로 떨어져야 다음 스트로크를 받는다 */
  releaseSpeed?: number
  /** 연속 스트로크 최소 간격 (ms) */
  minIntervalMs?: number
  /** 이 시간 이상 샘플이 끊기면(손을 놓침) 추적을 리셋 (ms) */
  maxGapMs?: number
  /** 속도 지수평활 계수 0~1 (1이면 평활 없음). 작을수록 부드럽지만 반응이 늦다. */
  smoothing?: number
}

/** 손 크기(손목-중지 첫마디 거리). 카메라 거리에 따른 속도 차이를 없애는 기준. */
export function handScale(landmarks: Landmark[], aspect = 1): number {
  const a = landmarks[0]
  const b = landmarks[9]
  return Math.hypot((a.x - b.x) * aspect, a.y - b.y)
}

/**
 * 손목 y좌표의 속도로 아래/위 스트로크를 감지한다.
 * 화면 좌표는 아래로 갈수록 y가 커지므로 속도 > 0 이 "다운 스트로크"다.
 */
export class StrumDetector {
  triggerSpeed: number
  releaseSpeed: number
  minIntervalMs: number
  maxGapMs: number
  smoothing: number

  /** 마지막으로 계산한 평활 속도 (부호 포함, 손길이/초). UI 표시/튜닝용. */
  speed = 0

  private lastY: number | null = null
  private lastT = 0
  private lastStrumT = -Infinity
  private armed = true

  constructor(opts: StrumOptions = {}) {
    this.triggerSpeed = opts.triggerSpeed ?? 3
    this.releaseSpeed = opts.releaseSpeed ?? 1
    this.minIntervalMs = opts.minIntervalMs ?? 120
    this.maxGapMs = opts.maxGapMs ?? 250
    this.smoothing = opts.smoothing ?? 0.6
  }

  /**
   * 프레임마다 호출.
   * @param y 손목 y (정규화 좌표)
   * @param scale 손 크기 (handScale) — 0이면 무시
   * @param t 시각 (ms)
   */
  push(y: number, scale: number, t: number): StrumEvent | null {
    if (scale <= 0) return null
    if (this.lastY === null || t - this.lastT > this.maxGapMs || t <= this.lastT) {
      this.lastY = y
      this.lastT = t
      this.speed = 0
      this.armed = true
      return null
    }

    const raw = ((y - this.lastY) / (t - this.lastT)) * 1000 / scale
    this.speed += this.smoothing * (raw - this.speed)
    this.lastY = y
    this.lastT = t

    const abs = Math.abs(this.speed)
    if (!this.armed) {
      if (abs < this.releaseSpeed) this.armed = true
      return null
    }
    if (abs < this.triggerSpeed || t - this.lastStrumT < this.minIntervalMs) return null

    this.armed = false
    this.lastStrumT = t
    const over = Math.min(1, (abs - this.triggerSpeed) / (this.triggerSpeed * 2))
    return {
      direction: this.speed > 0 ? 'down' : 'up',
      speed: abs,
      strength: 0.4 + 0.6 * over,
    }
  }

  reset() {
    this.lastY = null
    this.speed = 0
    this.armed = true
    this.lastStrumT = -Infinity
  }
}
