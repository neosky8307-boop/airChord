import { describe, expect, it } from 'vitest'
import { DEFAULT_TEMPLATES } from './definitions'
import { euclidean, matchChord, Stabilizer } from './matching'

describe('euclidean', () => {
  it('같은 벡터는 0, 알려진 거리를 계산한다', () => {
    expect(euclidean([1, 2, 3], [1, 2, 3])).toBe(0)
    expect(euclidean([0, 0], [3, 4])).toBe(5)
  })
})

describe('matchChord', () => {
  it('템플릿과 정확히 같으면 confidence 1', () => {
    const m = matchChord([0, 1, 1, 0, 0], DEFAULT_TEMPLATES, 0.8)
    expect(m?.id).toBe('G')
    expect(m?.confidence).toBe(1)
  })

  it('약간 흔들린 값도 가장 가까운 코드로 인식한다', () => {
    const m = matchChord([0.1, 0.9, 0.85, 0.1, 0.05], DEFAULT_TEMPLATES, 0.8)
    expect(m?.id).toBe('G')
    expect(m!.confidence).toBeGreaterThan(0)
    expect(m!.confidence).toBeLessThan(1)
  })

  it('임계값을 넘으면 null (어느 코드도 아님)', () => {
    // 모든 템플릿에서 멀리 떨어진 어정쩡한 손모양
    expect(matchChord([0.5, 0.5, 0.5, 0.5, 0.5], DEFAULT_TEMPLATES, 0.5)).toBeNull()
  })

  it('임계값을 키우면 같은 입력이 인식된다', () => {
    const v: [number, number, number, number, number] = [0.5, 0.5, 0.5, 0.5, 0.5]
    expect(matchChord(v, DEFAULT_TEMPLATES, 2)).not.toBeNull()
  })

  it('템플릿이 비어 있으면 null', () => {
    expect(matchChord([0, 0, 0, 0, 0], {}, 1)).toBeNull()
  })

  it('threshold 경계: 거리 == threshold면 인식, confidence 0', () => {
    const m = matchChord([0, 0, 0, 0, 0], { X: [0, 3, 4, 0, 0] }, 5)
    expect(m).toMatchObject({ id: 'X', confidence: 0 })
  })
})

describe('Stabilizer', () => {
  it('N프레임 연속이어야 확정된다 (기본 4)', () => {
    const s = new Stabilizer(4)
    expect(s.push('C')).toEqual({ confirmed: null, changed: false })
    expect(s.push('C')).toEqual({ confirmed: null, changed: false })
    expect(s.push('C')).toEqual({ confirmed: null, changed: false })
    expect(s.push('C')).toEqual({ confirmed: 'C', changed: true })
  })

  it('확정 후 같은 코드가 이어져도 changed는 한 번만 true', () => {
    const s = new Stabilizer(2)
    s.push('C')
    expect(s.push('C').changed).toBe(true)
    expect(s.push('C').changed).toBe(false)
    expect(s.push('C').changed).toBe(false)
  })

  it('중간에 다른 값이 끼면 카운트가 리셋된다 (떨림 무시)', () => {
    const s = new Stabilizer(3)
    s.push('C')
    s.push('C')
    s.push('G') // 1프레임 튐
    s.push('C')
    expect(s.push('C').confirmed).toBeNull()
    expect(s.push('C').confirmed).toBe('C')
  })

  it('확정된 코드에서 1프레임 튀어도 확정값은 유지된다', () => {
    const s = new Stabilizer(3)
    for (let i = 0; i < 3; i++) s.push('C')
    expect(s.push('G')).toEqual({ confirmed: 'C', changed: false })
    expect(s.push('C')).toEqual({ confirmed: 'C', changed: false })
  })

  it('다른 코드로 N프레임 이어지면 전환된다', () => {
    const s = new Stabilizer(2)
    s.push('C')
    s.push('C')
    s.push('G')
    expect(s.push('G')).toEqual({ confirmed: 'G', changed: true })
  })

  it('null이 N프레임 이어지면 "없음"으로 확정된다', () => {
    const s = new Stabilizer(2)
    s.push('C')
    s.push('C')
    s.push(null)
    expect(s.push(null)).toEqual({ confirmed: null, changed: true })
  })

  it('reset하면 처음 상태로 돌아간다', () => {
    const s = new Stabilizer(1)
    s.push('C')
    s.reset()
    expect(s.push('C')).toEqual({ confirmed: 'C', changed: true })
  })
})
