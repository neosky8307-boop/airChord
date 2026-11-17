import * as Tone from 'tone'
import type { Instrument, PlayOptions } from './instrument'

export class SynthInstrument implements Instrument {
  private synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.005, decay: 0.3, sustain: 0.35, release: 0.8 },
  }).toDestination()

  constructor() {
    this.synth.maxPolyphony = 16
    this.synth.volume.value = -8
  }

  /** 스트럼 시 음과 음 사이 간격 (초) */
  private static STRUM_GAP = 0.018

  playChord(notes: string[], opts: PlayOptions = {}) {
    const { velocity = 0.8, duration = 1.2, direction } = opts
    const now = Tone.now()
    if (!direction) {
      this.synth.triggerAttackRelease(notes, duration, now, velocity)
      return
    }
    // notes는 낮은 음 → 높은 음 순. 다운은 낮은 음부터, 업은 높은 음부터.
    const ordered = direction === 'down' ? notes : [...notes].reverse()
    ordered.forEach((n, i) =>
      this.synth.triggerAttackRelease(n, duration, now + i * SynthInstrument.STRUM_GAP, velocity),
    )
  }

  playNote(note: string, opts: Pick<PlayOptions, 'velocity' | 'duration'> = {}) {
    const { velocity = 0.8, duration = 0.7 } = opts
    this.synth.triggerAttackRelease(note, duration, Tone.now(), velocity)
  }

  stopAll() {
    this.synth.releaseAll()
  }

  dispose() {
    this.synth.dispose()
  }
}
