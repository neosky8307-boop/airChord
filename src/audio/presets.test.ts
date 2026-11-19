import { describe, expect, it } from 'vitest'
import { DEFAULT_TONE, isToneId, TONE_IDS, TONE_PRESETS } from './presets'

describe('TONE_PRESETS', () => {
  it('모든 id에 프리셋이 있고 id가 일치한다', () => {
    for (const id of TONE_IDS) expect(TONE_PRESETS[id].id).toBe(id)
    expect(new Set(TONE_IDS).size).toBe(TONE_IDS.length)
  })
  it('기본 음색이 목록에 있다', () => {
    expect(isToneId(DEFAULT_TONE)).toBe(true)
  })
  it('envelope/필터/리버브/음량이 유효한 범위다', () => {
    for (const p of Object.values(TONE_PRESETS)) {
      const { attack, decay, sustain, release } = p.envelope
      expect(attack).toBeGreaterThan(0)
      expect(decay).toBeGreaterThan(0)
      expect(release).toBeGreaterThan(0)
      expect(sustain).toBeGreaterThanOrEqual(0)
      expect(sustain).toBeLessThanOrEqual(1)
      expect(p.cutoff).toBeGreaterThan(100)
      expect(p.reverb).toBeGreaterThanOrEqual(0)
      expect(p.reverb).toBeLessThanOrEqual(1)
      expect(p.volume).toBeLessThan(0) // 클리핑 방지: 항상 감쇠
      expect(p.label.length).toBeGreaterThan(0)
    }
  })
})

describe('isToneId', () => {
  it('알려진 id만 통과', () => {
    expect(isToneId('pad')).toBe(true)
    expect(isToneId('nope')).toBe(false)
    expect(isToneId(3)).toBe(false)
    expect(isToneId(null)).toBe(false)
  })
})
