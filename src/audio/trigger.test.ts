import { describe, expect, it } from 'vitest'
import { ChordTrigger } from './trigger'

describe('ChordTrigger', () => {
  it('새 코드는 한 번만 재생한다', () => {
    const t = new ChordTrigger()
    expect(t.next('C')).toBe('C')
    expect(t.next('C')).toBeNull()
    expect(t.next('C')).toBeNull()
  })

  it('다른 코드로 바뀌면 재생한다', () => {
    const t = new ChordTrigger()
    t.next('C')
    expect(t.next('G')).toBe('G')
  })

  it('없음(null)은 재생하지 않고, 같은 코드로 돌아오면 다시 재생한다', () => {
    const t = new ChordTrigger()
    t.next('C')
    expect(t.next(null)).toBeNull()
    expect(t.next('C')).toBe('C')
  })

  it('처음부터 null이면 아무것도 재생하지 않는다', () => {
    expect(new ChordTrigger().next(null)).toBeNull()
  })

  it('reset 후에는 같은 코드도 다시 재생한다', () => {
    const t = new ChordTrigger()
    t.next('C')
    t.reset()
    expect(t.next('C')).toBe('C')
  })
})
