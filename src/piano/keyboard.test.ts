import { describe, expect, it } from 'vitest'
import { DEFAULT_RECT, keyAtPoint, layoutKeys, PIANO_NOTES, toDisplayX } from './keyboard'

describe('layoutKeys', () => {
  const keys = layoutKeys()
  it('건반 수만큼 만들고 빈틈/겹침 없이 이어진다', () => {
    expect(keys).toHaveLength(PIANO_NOTES.length)
    expect(keys[0].x0).toBeCloseTo(DEFAULT_RECT.left)
    expect(keys.at(-1)!.x1).toBeCloseTo(DEFAULT_RECT.right)
    for (let i = 1; i < keys.length; i++) expect(keys[i].x0).toBeCloseTo(keys[i - 1].x1)
  })
  it('같은 너비다', () => {
    const w = keys[0].x1 - keys[0].x0
    keys.forEach((k) => expect(k.x1 - k.x0).toBeCloseTo(w))
  })
})

describe('keyAtPoint', () => {
  const y = (DEFAULT_RECT.top + DEFAULT_RECT.bottom) / 2
  it('각 건반 중앙을 정확히 찾는다', () => {
    for (const k of layoutKeys()) expect(keyAtPoint((k.x0 + k.x1) / 2, y)?.note).toBe(k.note)
  })
  it('영역 밖은 null (위, 아래, 좌, 우)', () => {
    expect(keyAtPoint(0.5, DEFAULT_RECT.top - 0.01)).toBeNull()
    expect(keyAtPoint(0.5, DEFAULT_RECT.bottom + 0.01)).toBeNull()
    expect(keyAtPoint(DEFAULT_RECT.left - 0.01, y)).toBeNull()
    expect(keyAtPoint(DEFAULT_RECT.right, y)).toBeNull()
  })
  it('경계 위쪽 가장자리는 건반 안', () => {
    expect(keyAtPoint(0.5, DEFAULT_RECT.top)).not.toBeNull()
  })
  it('가장 오른쪽 끝 바로 안쪽은 마지막 건반', () => {
    expect(keyAtPoint(DEFAULT_RECT.right - 1e-6, y)?.note).toBe('C5')
  })
})

describe('toDisplayX', () => {
  it('반전 표시면 뒤집고 아니면 그대로', () => {
    expect(toDisplayX(0.2, true)).toBeCloseTo(0.8)
    expect(toDisplayX(0.2, false)).toBe(0.2)
  })
  it('반전 표시에서 카메라 원본 오른쪽은 화면 왼쪽(낮은 음)이다', () => {
    const y = 0.8
    expect(keyAtPoint(toDisplayX(0.95, true), y)?.note).toBe('C4')
    expect(keyAtPoint(toDisplayX(0.05, true), y)?.note).toBe('C5')
  })
})
