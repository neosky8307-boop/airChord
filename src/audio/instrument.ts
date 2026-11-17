/** 악기 교체용 인터페이스. 지금은 신스, 나중에 샘플러/MIDI로 같은 인터페이스를 구현한다. */
export interface Instrument {
  playChord(notes: string[], opts?: { velocity?: number; duration?: number }): void
  stopAll(): void
  dispose(): void
}
