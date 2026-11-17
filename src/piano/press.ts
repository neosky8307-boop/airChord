import type { FingerVector } from '../hand/fingers'
import { handScale } from '../chords/strum'
import type { Landmark } from '../hand/types'

/** 엄지, 검지, 중지, 약지, 새끼 손끝 랜드마크 */
const TIPS = [4, 8, 12, 16, 20]

export interface PressOptions {
  /** 손목 기준 손끝의 하강 속도 임계값 (손길이/초) */
  pressSpeed?: number
  /** 손가락 굽힘 속도 임계값 (펴짐값/초, 접히는 방향이 양수) */
  bendSpeed?: number
  /** 한 번 누른 뒤, 하강 속도가 이 값 아래로 떨어져야 다시 누를 수 있다 */
  releaseSpeed?: number
  /** 같은 손가락의 최소 재입력 간격 (ms) */
  minIntervalMs?: number
  /** 샘플이 이 시간 이상 끊기면 추적 리셋 (ms) */
  maxGapMs?: number
  /** 속도 지수평활 계수 (1이면 평활 없음) */
  smoothing?: number
}

export interface PressEvent {
  handId: string
  /** 0=엄지 … 4=새끼 */
  finger: number
  /** 누른 순간 손끝의 원본 정규화 좌표 */
  x: number
  y: number
  /** 0.4~1 */
  strength: number
}

export interface TrackedHand {
  id: string
  landmarks: Landmark[]
  /** fingerExtensions 결과 */
  ext: FingerVector
}

class FingerPress {
  private lastRel: number | null = null
  private lastExt = 0
  private lastT = 0
  private lastPressT = -Infinity
  private armed = true
  /** 하강 속도 (손길이/초, 아래가 양수) */
  down = 0
  /** 굽힘 속도 (펴짐값/초, 접히는 방향이 양수) */
  bend = 0

  push(rel: number, ext: number, scale: number, t: number, o: Required<PressOptions>): number | null {
    if (this.lastRel === null || t - this.lastT > o.maxGapMs || t <= this.lastT) {
      this.lastRel = rel
      this.lastExt = ext
      this.lastT = t
      this.down = 0
      this.bend = 0
      this.armed = true
      return null
    }
    const dt = (t - this.lastT) / 1000
    this.down += o.smoothing * ((rel - this.lastRel) / dt / scale - this.down)
    this.bend += o.smoothing * (-(ext - this.lastExt) / dt - this.bend)
    this.lastRel = rel
    this.lastExt = ext
    this.lastT = t

    if (!this.armed) {
      if (this.down < o.releaseSpeed) this.armed = true
      return null
    }
    if (this.down < o.pressSpeed || this.bend < o.bendSpeed) return null
    if (t - this.lastPressT < o.minIntervalMs) return null

    this.armed = false
    this.lastPressT = t
    const over = Math.min(1, (this.down - o.pressSpeed) / (o.pressSpeed * 2))
    return 0.4 + 0.6 * over
  }
}

/**
 * 손가락별 "누름" 감지.
 * 누름 = 손목에 대한 손끝의 하강이 빠르고(손 전체가 내려가는 건 상쇄) AND 그 손가락이 접히는 중일 때.
 * 두 조건을 모두 요구해서 손목 흔들림이나 손가락 떨림만으로는 울리지 않는다.
 */
export class AirPianoDetector {
  pressSpeed: number
  bendSpeed: number
  releaseSpeed: number
  minIntervalMs: number
  maxGapMs: number
  smoothing: number

  /** 이번 프레임 모든 손가락 중 최대 하강/굽힘 속도 (튜닝용 표시) */
  stats = { speed: 0, bend: 0 }

  private fingers = new Map<string, FingerPress>()

  constructor(opts: PressOptions = {}) {
    this.pressSpeed = opts.pressSpeed ?? 2.5
    this.bendSpeed = opts.bendSpeed ?? 2
    this.releaseSpeed = opts.releaseSpeed ?? 0.8
    this.minIntervalMs = opts.minIntervalMs ?? 100
    this.maxGapMs = opts.maxGapMs ?? 250
    this.smoothing = opts.smoothing ?? 0.6
  }

  update(hands: TrackedHand[], aspect: number, t: number): PressEvent[] {
    const events: PressEvent[] = []
    const alive = new Set<string>()
    let maxSpeed = 0
    let maxBend = 0
    for (const hand of hands) {
      const scale = handScale(hand.landmarks, aspect)
      if (scale <= 0) continue
      const wristY = hand.landmarks[0].y
      for (let f = 0; f < TIPS.length; f++) {
        const key = `${hand.id}:${f}`
        alive.add(key)
        let fp = this.fingers.get(key)
        if (!fp) this.fingers.set(key, (fp = new FingerPress()))
        const tip = hand.landmarks[TIPS[f]]
        const strength = fp.push(tip.y - wristY, hand.ext[f], scale, t, this)
        maxSpeed = Math.max(maxSpeed, fp.down)
        maxBend = Math.max(maxBend, fp.bend)
        if (strength !== null) events.push({ handId: hand.id, finger: f, x: tip.x, y: tip.y, strength })
      }
    }
    // 사라진 손의 추적은 버린다 (다시 나타났을 때 위치 점프를 속도로 오인하지 않도록)
    for (const key of this.fingers.keys()) if (!alive.has(key)) this.fingers.delete(key)
    this.stats = { speed: maxSpeed, bend: maxBend }
    return events
  }

  reset() {
    this.fingers.clear()
    this.stats = { speed: 0, bend: 0 }
  }
}
