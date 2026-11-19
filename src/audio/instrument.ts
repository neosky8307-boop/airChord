import type { ToneId } from './presets'

export interface PlayOptions {
  velocity?: number
  duration?: number
  /** 스트럼 방향. 지정하면 음을 시간차를 두고 쳐서 기타처럼 쓸어내린다. */
  direction?: 'down' | 'up'
}

/** 악기 교체용 인터페이스. 지금은 신스, 나중에 샘플러/MIDI로 같은 인터페이스를 구현한다. */
export interface Instrument {
  playChord(notes: string[], opts?: PlayOptions): void
  playNote(note: string, opts?: Pick<PlayOptions, 'velocity' | 'duration'>): void
  /** 음색을 바꾼다. 지원하지 않는 악기(샘플러 등)는 구현하지 않아도 된다. */
  setTone?(id: ToneId): void
  stopAll(): void
  dispose(): void
}
