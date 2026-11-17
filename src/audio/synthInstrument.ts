import * as Tone from 'tone'
import type { Instrument } from './instrument'

export class SynthInstrument implements Instrument {
  private synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.005, decay: 0.3, sustain: 0.35, release: 0.8 },
  }).toDestination()

  constructor() {
    this.synth.maxPolyphony = 16
    this.synth.volume.value = -8
  }

  playChord(notes: string[], opts: { velocity?: number; duration?: number } = {}) {
    const { velocity = 0.8, duration = 1.2 } = opts
    this.synth.triggerAttackRelease(notes, duration, Tone.now(), velocity)
  }

  stopAll() {
    this.synth.releaseAll()
  }

  dispose() {
    this.synth.dispose()
  }
}
