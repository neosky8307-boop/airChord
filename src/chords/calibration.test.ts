import { describe, expect, it } from 'vitest'
import { TemplateRecorder } from './calibration'
import { DEFAULT_TEMPLATES } from './definitions'
import { loadTemplates, saveTemplates, TEMPLATES_KEY } from './storage'

const opts = { delayMs: 1000, durationMs: 1000, minSamples: 3 }

describe('TemplateRecorder', () => {
  it('준비 → 녹화 → 완료 단계를 시간에 따라 전환한다', () => {
    const r = new TemplateRecorder('C', 0, opts)
    expect(r.phase(0)).toBe('prep')
    expect(r.prepRemaining(250)).toBe(750)
    expect(r.phase(999)).toBe('prep')
    expect(r.phase(1000)).toBe('recording')
    expect(r.progress(1500)).toBeCloseTo(0.5)
    expect(r.phase(2000)).toBe('done')
    expect(r.progress(5000)).toBe(1)
  })

  it('녹화 단계의 샘플만 평균에 반영한다 (준비 중 샘플은 무시)', () => {
    const r = new TemplateRecorder('C', 0, opts)
    r.add([1, 1, 1, 1, 1], 500) // prep → 무시
    r.add([0, 0.2, 0.4, 0.6, 0.8], 1100)
    r.add([0, 0.4, 0.6, 0.8, 1], 1500)
    r.add([0, 0.6, 0.8, 1, 1], 1900)
    r.add([1, 1, 1, 1, 1], 2500) // done → 무시
    const res = r.finish()
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.samples).toBe(3)
    const expected = [0, 0.4, 0.6, 0.8, 0.9333]
    res.template.forEach((v, i) => expect(v).toBeCloseTo(expected[i], 3))
  })

  it('흔들림(spread)은 손가락별 표준편차의 최댓값', () => {
    const r = new TemplateRecorder('C', 0, opts)
    r.add([0, 0, 0, 0, 0], 1100)
    r.add([0, 1, 0, 0, 0], 1200)
    r.add([0, 0, 0, 0, 0], 1300)
    r.add([0, 1, 0, 0, 0], 1400)
    const res = r.finish()
    expect(res.ok && res.spread).toBeCloseTo(0.5)
  })

  it('안정적으로 유지하면 spread가 0', () => {
    const r = new TemplateRecorder('C', 0, opts)
    for (const t of [1100, 1200, 1300]) r.add([0, 1, 0, 0, 0], t)
    const res = r.finish()
    expect(res.ok && res.spread).toBe(0)
  })

  it('샘플이 부족하면(손이 안 보임) 실패한다', () => {
    const r = new TemplateRecorder('C', 0, opts)
    r.add([0, 1, 0, 0, 0], 1100)
    expect(r.finish()).toEqual({ ok: false, id: 'C', reason: 'no-hand' })
  })
})

function fakeStorage(initial?: string) {
  const data = new Map<string, string>()
  if (initial !== undefined) data.set(TEMPLATES_KEY, initial)
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  }
}

describe('template storage', () => {
  it('저장한 사용자 템플릿을 기본값 위에 불러온다', () => {
    const s = fakeStorage()
    saveTemplates(s, { ...DEFAULT_TEMPLATES, C: [0.1, 0.9, 0.2, 0.3, 0.4] })
    const loaded = loadTemplates(s)
    expect(loaded.C).toEqual([0.1, 0.9, 0.2, 0.3, 0.4])
    expect(loaded.G).toEqual(DEFAULT_TEMPLATES.G)
  })

  it('기본값과 같은 템플릿은 저장하지 않는다', () => {
    const s = fakeStorage()
    saveTemplates(s, DEFAULT_TEMPLATES)
    expect(JSON.parse(s.data.get(TEMPLATES_KEY)!)).toEqual({})
  })

  it('저장소가 없으면 기본값', () => {
    expect(loadTemplates(null)).toEqual(DEFAULT_TEMPLATES)
  })

  it('깨진 JSON이면 기본값', () => {
    expect(loadTemplates(fakeStorage('{not json'))).toEqual(DEFAULT_TEMPLATES)
  })

  it('형식이 틀린 항목은 무시하고 나머지는 사용한다', () => {
    const bad = JSON.stringify({ C: [1, 2, 3], G: [0, 0, 0, 0, 5], Am: [0.5, 0.5, 0.5, 0.5, 0.5] })
    const loaded = loadTemplates(fakeStorage(bad))
    expect(loaded.C).toEqual(DEFAULT_TEMPLATES.C)
    expect(loaded.G).toEqual(DEFAULT_TEMPLATES.G)
    expect(loaded.Am).toEqual([0.5, 0.5, 0.5, 0.5, 0.5])
  })

  it('저장소 접근이 예외를 던져도 앱이 죽지 않는다', () => {
    const throwing = {
      getItem: () => { throw new Error('denied') },
      setItem: () => { throw new Error('denied') },
    }
    expect(loadTemplates(throwing)).toEqual(DEFAULT_TEMPLATES)
    expect(() => saveTemplates(throwing, DEFAULT_TEMPLATES)).not.toThrow()
  })
})
