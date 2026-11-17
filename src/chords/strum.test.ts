import { describe, expect, it } from 'vitest'
import { handScale, StrumDetector, type StrumEvent } from './strum'

const DT = 33 // ms, 약 30fps
const SCALE = 0.2 // 손 크기 (화면 높이 대비)

/** y 변화량 목록을 프레임 단위로 먹여서 발생한 이벤트들을 모은다. */
function feed(d: StrumDetector, deltas: number[], startY = 0.5, startT = 0, scale = SCALE) {
  const events: StrumEvent[] = []
  let y = startY
  let t = startT
  d.push(y, scale, t)
  for (const dy of deltas) {
    y += dy
    t += DT
    const e = d.push(y, scale, t)
    if (e) events.push(e)
  }
  return events
}

const plain = () => new StrumDetector({ smoothing: 1 }) // 평활 없음 → 계산이 결정적

describe('StrumDetector', () => {
  it('가만히 있으면 아무 일도 없다', () => {
    expect(feed(plain(), Array(30).fill(0))).toEqual([])
  })

  it('손떨림 정도의 작은 움직임은 무시한다', () => {
    const jitter = Array.from({ length: 40 }, (_, i) => (i % 2 ? 0.002 : -0.002))
    expect(feed(plain(), jitter)).toEqual([])
  })

  it('천천히 움직이면 판정하지 않는다', () => {
    // 프레임당 0.01 → 0.3/s → 1.5 손길이/s (< 3)
    expect(feed(plain(), Array(20).fill(0.01))).toEqual([])
  })

  it('빠르게 내리면 down 한 번', () => {
    const ev = feed(plain(), [0, 0, 0.05, 0.05, 0.05, 0.05, 0, 0])
    expect(ev).toHaveLength(1)
    expect(ev[0].direction).toBe('down')
  })

  it('빠르게 올리면 up 한 번', () => {
    const ev = feed(plain(), [0, 0.05, 0.05, 0.05, 0.05, 0, 0].map((v) => -v))
    expect(ev).toHaveLength(1)
    expect(ev[0].direction).toBe('up')
  })

  it('같은 스트로크 동안 빠른 프레임이 이어져도 한 번만 울린다', () => {
    expect(feed(plain(), Array(10).fill(0.06))).toHaveLength(1)
  })

  it('내렸다가 잠깐 멈추고 올리면 down, up 두 번', () => {
    const ev = feed(plain(), [0.06, 0.06, 0.06, 0, 0, 0, -0.06, -0.06, -0.06, 0])
    expect(ev.map((e) => e.direction)).toEqual(['down', 'up'])
  })

  it('최소 간격 안의 반대 방향 움직임은 무시한다 (되돌림 오인식 방지)', () => {
    // 속도가 0 근처를 거치지만 minInterval(120ms) 안이면 울리지 않는다
    const d = new StrumDetector({ smoothing: 1, minIntervalMs: 200 })
    const ev = feed(d, [0.06, 0, -0.06, -0.06])
    expect(ev.map((e) => e.direction)).toEqual(['down'])
  })

  it('더 빠르게 칠수록 strength가 크고 0.4~1 범위다', () => {
    const slow = feed(plain(), [0.03, 0.03])[0] // 4.5 손길이/s
    const fast = feed(plain(), [0.1, 0.1])[0] // 15 손길이/s
    expect(slow.strength).toBeGreaterThanOrEqual(0.4)
    expect(fast.strength).toBeLessThanOrEqual(1)
    expect(fast.strength).toBeGreaterThan(slow.strength)
  })

  it('손 크기로 정규화한다: 같은 움직임이어도 손이 크면(가까우면) 덜 빠르다', () => {
    const deltas = [0.05, 0.05, 0.05] // 1.5/s
    expect(feed(plain(), deltas, 0.5, 0, 0.2)).toHaveLength(1) // 7.5 손길이/s
    expect(feed(plain(), deltas, 0.5, 0, 0.6)).toHaveLength(0) // 2.5 손길이/s
  })

  it('손을 놓쳤다 다시 나타나도 위치 점프를 스트로크로 오인하지 않는다', () => {
    const d = plain()
    d.push(0.2, SCALE, 0)
    d.push(0.2, SCALE, DT)
    // 500ms 동안 안 보이다가 아래쪽에서 다시 나타남
    expect(d.push(0.8, SCALE, 600)).toBeNull()
    expect(d.push(0.8, SCALE, 600 + DT)).toBeNull()
  })

  it('시간이 거꾸로 가거나 같은 프레임이 다시 들어와도 안전하다', () => {
    const d = plain()
    d.push(0.5, SCALE, 100)
    expect(d.push(0.9, SCALE, 100)).toBeNull()
    expect(d.push(0.9, SCALE, 50)).toBeNull()
  })

  it('scale이 0이면 무시한다 (NaN 방지)', () => {
    const d = plain()
    expect(d.push(0.5, 0, 0)).toBeNull()
    expect(d.push(0.9, 0, DT)).toBeNull()
    expect(Number.isFinite(d.speed)).toBe(true)
  })

  it('기본 평활을 켜도 충분히 빠른 스트로크는 잡는다', () => {
    const ev = feed(new StrumDetector(), Array(6).fill(0.06))
    expect(ev).toHaveLength(1)
  })

  it('reset하면 이전 상태를 버린다', () => {
    const d = plain()
    feed(d, [0.06, 0.06])
    d.reset()
    expect(d.speed).toBe(0)
    expect(feed(d, [0.06, 0.06])).toHaveLength(1)
  })
})

describe('handScale', () => {
  it('손목-중지 첫마디 거리를 aspect를 반영해 계산한다', () => {
    const lm = Array.from({ length: 21 }, () => ({ x: 0, y: 0, z: 0 }))
    lm[9] = { x: 0.3, y: 0.4, z: 0 }
    expect(handScale(lm)).toBeCloseTo(0.5)
    expect(handScale(lm, 2)).toBeCloseTo(Math.hypot(0.6, 0.4))
  })
})
