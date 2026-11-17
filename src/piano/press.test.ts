import { describe, expect, it } from 'vitest'
import { AirPianoDetector, type PressEvent } from './press'

const DT = 33

describe('AirPianoDetector', () => {
  const plain = () => new AirPianoDetector({ smoothing: 1 })

  it('가만히 있으면 아무 일도 없다', () => {
    const d = plain()
    const ev = run(d, Array(20).fill({}))
    expect(ev).toEqual([])
  })

  it('한 손가락을 빠르게 굽혀 내리면 그 손가락의 누름 한 번', () => {
    const ev = run(plain(), [{}, {}, step(1, 0.05, 0.2), step(1, 0.05, 0.2), step(1, 0.05, 0.2), {}, {}])
    expect(ev).toHaveLength(1)
    expect(ev[0].finger).toBe(1)
    expect(ev[0].handId).toBe('Right')
    expect(ev[0].strength).toBeGreaterThanOrEqual(0.4)
    expect(ev[0].strength).toBeLessThanOrEqual(1)
  })

  it('손끝만 내려가고 굽힘이 없으면(손목 흔들림 등) 울리지 않는다', () => {
    expect(run(plain(), [{}, step(1, 0.05, 0), step(1, 0.05, 0), step(1, 0.05, 0)])).toEqual([])
  })

  it('굽힘만 있고 손끝 하강이 없으면 울리지 않는다', () => {
    expect(run(plain(), [{}, step(1, 0, 0.2), step(1, 0, 0.2), step(1, 0, 0.2)])).toEqual([])
  })

  it('손 전체가 내려가는 건 상쇄된다 (손목과 손끝이 함께 이동)', () => {
    const frames = Array.from({ length: 8 }, () => ({ wrist: 0.06, tips: [0.06, 0.06, 0.06, 0.06, 0.06] }))
    expect(run(plain(), [{}, ...frames])).toEqual([])
  })

  it('누른 채로 계속 내려가도 한 번만, 올렸다가 다시 누르면 또 한 번', () => {
    const press = [step(2, 0.05, 0.2), step(2, 0.05, 0.2), step(2, 0.05, 0.2)]
    const release = [step(2, -0.05, -0.2), step(2, -0.05, -0.2), {}, {}]
    const ev = run(plain(), [{}, ...press, ...press, ...release, ...press])
    expect(ev.map((e) => e.finger)).toEqual([2, 2])
  })

  it('여러 손가락은 서로 독립적으로 판정한다 (동시 누름 → 이벤트 2개)', () => {
    const both = { tips: [0, 0.05, 0, 0.05, 0], exts: [0, -0.2, 0, -0.2, 0] }
    const ev = run(plain(), [{}, both, both, both])
    expect(ev.map((e) => e.finger).sort()).toEqual([1, 3])
  })

  it('두 손은 따로 추적한다 (오른손만 누르면 오른손 이벤트만)', () => {
    const d = plain()
    const ev: PressEvent[] = []
    for (let i = 0; i < 5; i++) {
      const n = Math.min(Math.max(i - 1, 0), 3) // 1~3프레임 동안 누르는 중
      const right = makeHand('Right', {}, 0.2, {
        wrist: 0.5,
        tips: [0.1, 0.15 - 0.05 * n, 0.15, 0.15, 0.15],
        ext: [1, 1 - 0.2 * n, 1, 1, 1],
      })
      ev.push(...d.update([makeHand('Left', {}), right], 1, i * DT))
    }
    expect(ev).toHaveLength(1)
    expect(ev[0].handId).toBe('Right')
  })

  it('손이 사라졌다 다른 위치에서 나타나도 오인하지 않는다', () => {
    const d = plain()
    d.update([makeHand('Right', {})], 1, 0)
    d.update([makeHand('Right', {})], 1, DT)
    d.update([], 1, 400) // 사라짐
    const ev = d.update([makeHand('Right', { tips: [0, 0.4, 0, 0, 0], exts: [0, -0.8, 0, 0, 0] })], 1, 400 + DT)
    expect(ev).toEqual([])
  })

  it('손 크기로 정규화한다: 같은 움직임도 손이 크면 덜 빠르다', () => {
    const small = run(plain(), [{}, step(1, 0.05, 0.2), step(1, 0.05, 0.2)], 0.2)
    const big = run(plain(), [{}, step(1, 0.05, 0.2), step(1, 0.05, 0.2)], 1) // 1.5 손길이/s < 2.5
    expect(small).toHaveLength(1)
    expect(big).toHaveLength(0)
  })

  it('누른 위치(x,y)를 이벤트에 담는다', () => {
    const ev = run(plain(), [{}, step(1, 0.05, 0.2), step(1, 0.05, 0.2)])
    expect(ev[0].x).toBeCloseTo(0.5 + 0.02 * 1)
    expect(ev[0].y).toBeGreaterThan(0)
  })

  it('stats에 최대 속도를 기록하고 reset하면 지운다', () => {
    const d = plain()
    run(d, [{}, step(1, 0.05, 0.2)])
    expect(d.stats.speed).toBeGreaterThan(0)
    d.reset()
    expect(d.stats).toEqual({ speed: 0, bend: 0 })
  })
})

// ---- helpers ----
interface Frame {
  wrist?: number
  tips?: number[]
  exts?: number[]
}
/** finger 손가락의 손끝 y를 dy만큼, 펴짐값을 dExt만큼 변화시키는 프레임 */
function step(finger: number, dy: number, dExt: number): Frame {
  const tips = [0, 0, 0, 0, 0]
  const exts = [0, 0, 0, 0, 0]
  tips[finger] = dy
  exts[finger] = -dExt
  return { tips, exts }
}

function makeHand(id: string, f: Frame, scale = 0.2, state = { wrist: 0.5, tips: [0.1, 0.15, 0.15, 0.15, 0.15], ext: [1, 1, 1, 1, 1] }) {
  const lm = Array.from({ length: 21 }, () => ({ x: 0.5, y: state.wrist, z: 0 }))
  lm[9] = { x: 0.5, y: state.wrist - scale, z: 0 }
  const tipIdx = [4, 8, 12, 16, 20]
  tipIdx.forEach((i, k) => (lm[i] = { x: 0.5 + 0.02 * k, y: state.wrist - state.tips[k] + (f.tips?.[k] ?? 0), z: 0 }))
  return { id, landmarks: lm, ext: state.ext as [number, number, number, number, number] }
}

/** 프레임별 변화량을 누적해 한 손을 계속 이동시키며 이벤트를 모은다. */
function run(d: AirPianoDetector, frames: Frame[], scale = 0.2): PressEvent[] {
  const events: PressEvent[] = []
  let wrist = 0.5
  const tips = [0.1, 0.15, 0.15, 0.15, 0.15] // 손목 위쪽으로 떨어진 거리(펴진 상태)
  const ext = [1, 1, 1, 1, 1]
  frames.forEach((f, i) => {
    wrist += f.wrist ?? 0
    for (let k = 0; k < 5; k++) {
      tips[k] -= f.tips?.[k] ?? 0 // y가 커지면(아래로) 위쪽 거리는 줄어든다
      tips[k] += f.wrist ? f.wrist : 0 // 손 전체 이동분은 손목과 같이 움직임
      ext[k] += f.exts?.[k] ?? 0
    }
    const hand = makeHand('Right', {}, scale, { wrist, tips: [...tips], ext: [...ext] })
    events.push(...d.update([hand], 1, i * DT))
  })
  return events
}
