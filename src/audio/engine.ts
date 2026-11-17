import * as Tone from 'tone'
import { CHORDS } from '../chords/definitions'
import type { Instrument } from './instrument'
import { SynthInstrument } from './synthInstrument'

let instrument: Instrument | null = null

/** 반드시 사용자 클릭 핸들러 안에서 호출한다 (브라우저 자동재생 정책). */
export async function startAudio(): Promise<void> {
  if (!instrument) {
    // 지연 최소화: Tone 기본 lookAhead(100ms)를 줄인다. 컨텍스트는 한 번만 만든다.
    Tone.setContext(new Tone.Context({ latencyHint: 'interactive', lookAhead: 0.01 }))
    instrument = new SynthInstrument()
  }
  await Tone.start()
}

export function setInstrument(next: Instrument) {
  instrument?.dispose()
  instrument = next
}

export function playChord(id: string): void {
  const chord = CHORDS.find((c) => c.id === id)
  if (chord) instrument?.playChord(chord.notes)
}

export function stopAudio(): void {
  instrument?.stopAll()
}

/** 오디오 출력 장치까지의 지연(ms). 브라우저가 제공하는 만큼만 반영된다. */
export function outputLatencyMs(): number {
  const raw = Tone.getContext().rawContext as AudioContext
  return ((raw.baseLatency ?? 0) + (raw.outputLatency ?? 0)) * 1000
}
