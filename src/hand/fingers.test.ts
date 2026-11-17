import { describe, expect, it } from 'vitest'
import { DEFAULT_RANGES, fingerExtensions, fingerRatios } from './fingers'
import type { Landmark } from './types'

interface Pose {
  thumb: number // 엄지끝-새끼MCP / 손바닥 폭 비율
  index: number // 손목-손끝 / 손목-MCP 비율
  middle: number
  ring: number
  pinky: number
}

/** 손목이 원점, 손바닥 폭이 1인 합성 손. angle로 평면 회전, scale로 크기를 바꾼다. */
function makeHand(pose: Pose, { angle = 0, scale = 1 } = {}): Landmark[] {
  const lm: Landmark[] = Array.from({ length: 21 }, () => ({ x: 0, y: 0, z: 0 }))
  const set = (i: number, x: number, y: number) => {
    const c = Math.cos(angle)
    const s = Math.sin(angle)
    lm[i] = { x: (x * c - y * s) * scale, y: (x * s + y * c) * scale, z: 0 }
  }
  // MCP는 손목에서 거리 1 (위쪽 y=-1 기준), 가로로 퍼짐: index -0.5, pinky +0.5
  const mcpX = { 5: -0.5, 9: -0.17, 13: 0.17, 17: 0.5 }
  const mcpY = { 5: -1, 9: -1, 13: -1, 17: -1 }
  for (const i of [5, 9, 13, 17] as const) set(i, mcpX[i], mcpY[i])
  // 손끝: 손목에서 (MCP 방향)으로 ratio만큼 떨어진 점
  const tips: [number, number, number][] = [
    [8, 5, pose.index],
    [12, 9, pose.middle],
    [16, 13, pose.ring],
    [20, 17, pose.pinky],
  ]
  for (const [tip, mcp, ratio] of tips) set(tip, mcpX[mcp as 5] * ratio, mcpY[mcp as 5] * ratio)
  // 엄지끝: 새끼 MCP(0.5,-1)에서 thumb(폭=1) 만큼 떨어진 점
  set(4, 0.5 - pose.thumb, -1)
  return lm
}

const OPEN: Pose = { thumb: 1.6, index: 2, middle: 2, ring: 2, pinky: 2 }
const FIST: Pose = { thumb: 0.5, index: 0.6, middle: 0.6, ring: 0.6, pinky: 0.6 }

describe('fingerRatios', () => {
  it('합성 손의 비율을 그대로 복원한다', () => {
    const r = fingerRatios(makeHand({ thumb: 1.2, index: 1.5, middle: 1.4, ring: 1.3, pinky: 1.2 }))
    r.forEach((v, i) => expect(v).toBeCloseTo([1.2, 1.5, 1.4, 1.3, 1.2][i], 5))
  })

  it('랜드마크가 겹쳐 분모가 0이어도 NaN이 나오지 않는다', () => {
    const zero = Array.from({ length: 21 }, () => ({ x: 0, y: 0, z: 0 }))
    expect(fingerRatios(zero).every((v) => v === 0)).toBe(true)
  })
})

describe('fingerExtensions', () => {
  it('활짝 편 손은 전부 1', () => {
    expect(fingerExtensions(makeHand(OPEN))).toEqual([1, 1, 1, 1, 1])
  })

  it('주먹은 전부 0', () => {
    expect(fingerExtensions(makeHand(FIST))).toEqual([0, 0, 0, 0, 0])
  })

  it('중간값은 0과 1 사이에서 선형으로 나온다', () => {
    const { curl, open } = DEFAULT_RANGES.index
    const mid = (curl + open) / 2
    const e = fingerExtensions(makeHand({ ...FIST, index: mid }))
    expect(e[1]).toBeCloseTo(0.5, 5)
    expect(e[2]).toBe(0)
  })

  it('손가락별로 독립적이다 (검지만 폄)', () => {
    expect(fingerExtensions(makeHand({ ...FIST, index: 2 }))).toEqual([0, 1, 0, 0, 0])
  })

  it('손 회전과 크기에 영향받지 않는다', () => {
    const base = fingerExtensions(makeHand({ ...FIST, middle: 1.45 }))
    const moved = fingerExtensions(makeHand({ ...FIST, middle: 1.45 }, { angle: 1.1, scale: 0.4 }))
    moved.forEach((v, i) => expect(v).toBeCloseTo(base[i], 5))
  })

  it('aspect를 주면 가로로 늘어난 정규화 좌표를 보정한다', () => {
    // 실제 정사각형 손을 4:3 영상에 정규화하면 x가 3/4로 줄어든다.
    const squashed = makeHand(OPEN).map((p) => ({ ...p, x: p.x * 0.75 }))
    const corrected = fingerExtensions(squashed, { aspect: 4 / 3 })
    expect(corrected).toEqual([1, 1, 1, 1, 1])
  })
})
