import type { FingerVector } from '../hand/fingers'

export type RecorderResult =
  | { ok: true; id: string; template: FingerVector; samples: number; spread: number }
  | { ok: false; id: string; reason: 'no-hand' }

export interface RecorderOptions {
  /** 녹화 시작 전 손모양을 만들 준비 시간 (ms) */
  delayMs?: number
  /** 평균을 낼 녹화 시간 (ms) */
  durationMs?: number
  /** 이보다 샘플이 적으면 실패 (손이 안 보였던 것으로 간주) */
  minSamples?: number
}

export type RecorderPhase = 'prep' | 'recording' | 'done'

/** 손가락 펴짐 벡터를 일정 시간 모아 평균을 낸다. 시간은 호출자가 넘겨서 테스트하기 쉽다. */
export class TemplateRecorder {
  readonly chordId: string
  private startAt: number
  private delayMs: number
  private durationMs: number
  private minSamples: number
  private samples: FingerVector[] = []

  constructor(chordId: string, startAt: number, opts: RecorderOptions = {}) {
    this.chordId = chordId
    this.startAt = startAt
    this.delayMs = opts.delayMs ?? 1000
    this.durationMs = opts.durationMs ?? 1500
    this.minSamples = opts.minSamples ?? 8
  }

  phase(now: number): RecorderPhase {
    if (now < this.startAt + this.delayMs) return 'prep'
    if (now < this.startAt + this.delayMs + this.durationMs) return 'recording'
    return 'done'
  }

  /** 준비 단계에서 남은 시간 (ms) */
  prepRemaining(now: number): number {
    return Math.max(0, this.startAt + this.delayMs - now)
  }

  /** 녹화 단계 진행률 0~1 */
  progress(now: number): number {
    const t = (now - this.startAt - this.delayMs) / this.durationMs
    return Math.min(1, Math.max(0, t))
  }

  /** 녹화 단계에서만 샘플을 받는다. */
  add(vec: FingerVector, now: number): void {
    if (this.phase(now) === 'recording') this.samples.push(vec)
  }

  finish(): RecorderResult {
    const n = this.samples.length
    if (n < this.minSamples) return { ok: false, id: this.chordId, reason: 'no-hand' }
    const mean = [0, 0, 0, 0, 0]
    for (const s of this.samples) for (let i = 0; i < 5; i++) mean[i] += s[i] / n
    // 손가락별 표준편차 중 최댓값 = 녹화 중 손모양이 얼마나 흔들렸는지
    let spread = 0
    for (let i = 0; i < 5; i++) {
      const variance = this.samples.reduce((acc, s) => acc + (s[i] - mean[i]) ** 2, 0) / n
      spread = Math.max(spread, Math.sqrt(variance))
    }
    return { ok: true, id: this.chordId, template: mean as FingerVector, samples: n, spread }
  }
}
