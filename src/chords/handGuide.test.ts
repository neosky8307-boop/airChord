import { describe, expect, it } from 'vitest'
import { FINGER_NAMES, type FingerVector } from '../hand/fingers'
import { DEFAULT_TEMPLATES } from './definitions'
import { handGuideShapes, noteNames, PALM, thumbOnRight } from './handGuide'

const OPEN: FingerVector = [1, 1, 1, 1, 1]
const FIST: FingerVector = [0, 0, 0, 0, 0]

describe('handGuideShapes', () => {
  it('손가락 5개를 FINGER_NAMES 순서로 돌려준다', () => {
    expect(handGuideShapes(OPEN).map((s) => s.name)).toEqual([...FINGER_NAMES])
  })

  it('펴짐이 클수록 길이가 길다 (각 손가락)', () => {
    const open = handGuideShapes(OPEN)
    const fist = handGuideShapes(FIST)
    const half = handGuideShapes([0.5, 0.5, 0.5, 0.5, 0.5])
    for (let i = 0; i < 5; i++) {
      expect(open[i].length).toBeGreaterThan(half[i].length)
      expect(half[i].length).toBeGreaterThan(fist[i].length)
    }
  })

  it('길이는 선형으로 보간된다', () => {
    const [thumb] = handGuideShapes([0.5, 0, 0, 0, 0])
    const lo = handGuideShapes(FIST)[0].length
    const hi = handGuideShapes(OPEN)[0].length
    expect(thumb.length).toBeCloseTo((lo + hi) / 2)
  })

  it('엄지만 각도가 변하고, 접으면 손바닥 쪽(음수), 펴면 바깥쪽(양수)', () => {
    const open = handGuideShapes(OPEN)
    const fist = handGuideShapes(FIST)
    expect(fist[0].angle).toBeLessThan(0)
    expect(open[0].angle).toBeGreaterThan(0)
    for (let i = 1; i < 5; i++) {
      expect(open[i].angle).toBe(0)
      expect(fist[i].angle).toBe(0)
    }
  })

  it('범위를 벗어나거나 NaN인 값도 안전하게 보정한다', () => {
    const shapes = handGuideShapes([2, -1, NaN, 0.5, Infinity] as unknown as FingerVector)
    expect(shapes.map((s) => s.ext)).toEqual([1, 0, 0, 0.5, 0])
    shapes.forEach((s) => expect(Number.isFinite(s.length)).toBe(true))
  })

  it('엄지가 오른쪽에 있고 새끼 → 약지 → 중지 → 검지 → 엄지 순으로 가로 배치된다', () => {
    const x = Object.fromEntries(handGuideShapes(OPEN).map((s) => [s.name, s.x]))
    expect(x.pinky).toBeLessThan(x.ring)
    expect(x.ring).toBeLessThan(x.middle)
    expect(x.middle).toBeLessThan(x.index)
    expect(x.index).toBeLessThan(x.thumb)
  })

  it('손가락 뿌리는 손바닥 안쪽에 있고 폈을 때도 viewBox 밖으로 나가지 않는다', () => {
    for (const s of handGuideShapes(OPEN)) {
      expect(s.x).toBeGreaterThan(PALM.x)
      expect(s.x).toBeLessThan(PALM.x + PALM.width)
      if (s.name !== 'thumb') expect(s.y - s.length).toBeGreaterThanOrEqual(0)
    }
  })

  it('기본 템플릿끼리는 모양이 서로 다르다 (가이드로 구분 가능)', () => {
    const sig = (id: string) => handGuideShapes(DEFAULT_TEMPLATES[id]).map((s) => s.length.toFixed(1)).join(',')
    const all = Object.keys(DEFAULT_TEMPLATES).map(sig)
    expect(new Set(all).size).toBe(all.length)
  })
})

describe('thumbOnRight', () => {
  it('왼손 + 반전 표시 → 오른쪽', () => expect(thumbOnRight('Left', true)).toBe(true))
  it('왼손 + 원본 표시 → 왼쪽', () => expect(thumbOnRight('Left', false)).toBe(false))
  it('오른손 + 반전 표시 → 왼쪽', () => expect(thumbOnRight('Right', true)).toBe(false))
  it('오른손 + 원본 표시 → 오른쪽', () => expect(thumbOnRight('Right', false)).toBe(true))
})

describe('noteNames', () => {
  it('옥타브 숫자를 뗀다', () => {
    expect(noteNames(['C4', 'E4', 'G4'])).toBe('C E G')
    expect(noteNames(['D4', 'F#4', 'A4'])).toBe('D F# A')
  })
})
