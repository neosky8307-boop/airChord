import * as Tone from 'tone'
import { CHORDS } from '../chords/definitions'
import type { Instrument, PlayOptions } from './instrument'
import { DEFAULT_TONE, type ToneId } from './presets'
import { SynthInstrument } from './synthInstrument'

let instrument: Instrument | null = null
/** 악기가 만들어지기 전에 고른 음색도 기억해 두었다가 적용한다. */
let currentTone: ToneId = DEFAULT_TONE

/** 반드시 사용자 클릭 핸들러 안에서 호출한다 (브라우저 자동재생 정책). */
export async function startAudio(): Promise<void> {
  if (!instrument) {
    // 지연 최소화: Tone 기본 lookAhead(100ms)를 줄인다. 컨텍스트는 한 번만 만든다.
    Tone.setContext(new Tone.Context({ latencyHint: 'interactive', lookAhead: 0.01 }))
    instrument = new SynthInstrument(currentTone)
  }
  await Tone.start()
}

export function setTone(id: ToneId): void {
  currentTone = id
  instrument?.setTone?.(id)
}

export function setInstrument(next: Instrument) {
  instrument?.dispose()
  instrument = next
  instrument.setTone?.(currentTone)
}

export function playChord(id: string, opts?: PlayOptions): void {
  const chord = CHORDS.find((c) => c.id === id)
  if (chord) instrument?.playChord(chord.notes, opts)
}

export function playNote(note: string, opts?: Pick<PlayOptions, 'velocity' | 'duration'>): void {
  instrument?.playNote(note, opts)
}

export function stopAudio(): void {
  instrument?.stopAll()
}

/** 오디오 출력 장치까지의 지연(ms). 브라우저가 제공하는 만큼만 반영된다. */
export function outputLatencyMs(): number {
  const raw = Tone.getContext().rawContext as AudioContext
  return ((raw.baseLatency ?? 0) + (raw.outputLatency ?? 0)) * 1000
}
