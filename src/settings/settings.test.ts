import { describe, expect, it } from 'vitest'
import {
  clampNumeric,
  DEFAULT_SETTINGS,
  loadSettings,
  NUMERIC_RANGES,
  sanitizeSettings,
  saveSettings,
  SETTINGS_KEY,
  type NumericSettingKey,
} from './settings'

const keys = Object.keys(NUMERIC_RANGES) as NumericSettingKey[]

describe('NUMERIC_RANGES', () => {
  it('기본값은 모두 허용 범위 안이다', () => {
    for (const k of keys) {
      expect(DEFAULT_SETTINGS[k]).toBeGreaterThanOrEqual(NUMERIC_RANGES[k].min)
      expect(DEFAULT_SETTINGS[k]).toBeLessThanOrEqual(NUMERIC_RANGES[k].max)
    }
  })
})

describe('clampNumeric', () => {
  it('범위 밖은 끝값으로 자른다', () => {
    expect(clampNumeric('threshold', -5)).toBe(0.2)
    expect(clampNumeric('threshold', 99)).toBe(2)
  })
  it('step에 맞춰 반올림하고 부동소수점 오차를 없앤다', () => {
    expect(clampNumeric('threshold', 0.83)).toBe(0.85)
    expect(clampNumeric('stableFrames', 3.6)).toBe(4)
  })
  it('NaN/Infinity는 기본값', () => {
    expect(clampNumeric('stableFrames', NaN)).toBe(DEFAULT_SETTINGS.stableFrames)
    expect(clampNumeric('strumThreshold', Infinity)).toBe(DEFAULT_SETTINGS.strumThreshold)
  })
})

describe('sanitizeSettings', () => {
  it('유효한 값은 그대로 유지한다', () => {
    const s = { ...DEFAULT_SETTINGS, mirror: false, chordHand: 'Right' as const, threshold: 1.2, cameraId: 'abc' }
    expect(sanitizeSettings(s)).toEqual(s)
  })
  it('객체가 아니면 기본값', () => {
    for (const bad of [null, undefined, 'x', 5, []]) expect(sanitizeSettings(bad)).toEqual(DEFAULT_SETTINGS)
  })
  it('필드별로 잘못된 값만 기본값으로 대체한다', () => {
    const s = sanitizeSettings({ mirror: 'yes', chordHand: 'Middle', threshold: '1', stableFrames: 6, cameraId: '' })
    expect(s.mirror).toBe(DEFAULT_SETTINGS.mirror)
    expect(s.chordHand).toBe(DEFAULT_SETTINGS.chordHand)
    expect(s.threshold).toBe(DEFAULT_SETTINGS.threshold)
    expect(s.cameraId).toBeNull()
    expect(s.stableFrames).toBe(6)
  })
  it('범위를 벗어난 숫자는 보정한다', () => {
    expect(sanitizeSettings({ stableFrames: 100 }).stableFrames).toBe(10)
  })
})

describe('load/save', () => {
  const fake = (initial?: string) => {
    const data = new Map<string, string>()
    if (initial !== undefined) data.set(SETTINGS_KEY, initial)
    return { data, getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) }
  }
  it('저장 후 그대로 복원한다', () => {
    const s = fake()
    const custom = { ...DEFAULT_SETTINGS, mirror: false, stableFrames: 7, cameraId: 'cam-1' }
    saveSettings(s, custom)
    expect(loadSettings(s)).toEqual(custom)
  })
  it('저장소가 없거나 비어 있으면 기본값', () => {
    expect(loadSettings(null)).toEqual(DEFAULT_SETTINGS)
    expect(loadSettings(fake())).toEqual(DEFAULT_SETTINGS)
  })
  it('깨진 JSON이면 기본값', () => {
    expect(loadSettings(fake('{oops'))).toEqual(DEFAULT_SETTINGS)
  })
  it('저장소 접근이 예외를 던져도 죽지 않는다', () => {
    const boom = { getItem: () => { throw new Error('x') }, setItem: () => { throw new Error('x') } }
    expect(loadSettings(boom)).toEqual(DEFAULT_SETTINGS)
    expect(() => saveSettings(boom, DEFAULT_SETTINGS)).not.toThrow()
  })
  it('기본값 객체를 공유하지 않는다 (복사본 반환)', () => {
    const a = loadSettings(null)
    a.mirror = false
    expect(loadSettings(null).mirror).toBe(true)
  })
})
