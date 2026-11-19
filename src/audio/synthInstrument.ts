import * as Tone from 'tone'
import type { Instrument, PlayOptions } from './instrument'
import { DEFAULT_TONE, TONE_PRESETS, type ToneId } from './presets'

export class SynthInstrument implements Instrument {
  /** 스트럼 시 음과 음 사이 간격 (초) */
  private static STRUM_GAP = 0.018

  private reverb = new Tone.Freeverb({ roomSize: 0.75, dampening: 3500, wet: 0.2 }).toDestination()
  private filter = new Tone.Filter(4000, 'lowpass').connect(this.reverb)
  private synth = new Tone.PolySynth(Tone.Synth).connect(this.filter)

  /**
   * 지금 울리고 있는 코드. Tone의 예약 해제(triggerAttackRelease)는 "같은 음 중 가장 오래된 소리"를
   * 끄기 때문에, 코드를 바꿔 치면 이전 코드의 예약 해제가 새 코드를 일찍 끊을 수 있다.
   * 그래서 코드의 해제는 직접 타이머로 관리하고, 새 코드를 치면 이전 타이머를 취소한다.
   */
  private ringing: { notes: string[]; timer: ReturnType<typeof setTimeout> } | null = null

  constructor(tone: ToneId = DEFAULT_TONE) {
    this.synth.maxPolyphony = 24
    this.setTone(tone)
  }

  setTone(id: ToneId) {
    const p = TONE_PRESETS[id]
    this.synth.set({ oscillator: p.oscillator, envelope: p.envelope } as Partial<Tone.SynthOptions>)
    this.synth.volume.value = p.volume
    this.filter.frequency.value = p.cutoff
    this.reverb.wet.value = p.reverb
  }

  /** 이전 코드를 즉시 해제한다. (해제 후 여운은 envelope.release만큼 이어진다) */
  private cutRinging(time: number) {
    if (!this.ringing) return
    clearTimeout(this.ringing.timer)
    this.synth.triggerRelease(this.ringing.notes, time)
    this.ringing = null
  }

  playChord(notes: string[], opts: PlayOptions = {}) {
    const { velocity = 0.8, duration = 3, direction } = opts
    const now = Tone.now()
    this.cutRinging(now)

    // notes는 낮은 음 → 높은 음 순. 다운은 낮은 음부터, 업은 높은 음부터.
    const ordered = direction === 'up' ? [...notes].reverse() : notes
    const gap = direction ? SynthInstrument.STRUM_GAP : 0
    ordered.forEach((n, i) => this.synth.triggerAttack(n, now + i * gap, velocity))

    const entry = {
      notes: ordered,
      timer: setTimeout(() => {
        this.synth.triggerRelease(entry.notes, Tone.now())
        if (this.ringing === entry) this.ringing = null
      }, duration * 1000),
    }
    this.ringing = entry
  }

  playNote(note: string, opts: Pick<PlayOptions, 'velocity' | 'duration'> = {}) {
    const { velocity = 0.8, duration = 0.7 } = opts
    this.synth.triggerAttackRelease(note, duration, Tone.now(), velocity)
  }

  stopAll() {
    this.cutRinging(Tone.now())
    this.synth.releaseAll()
  }

  dispose() {
    if (this.ringing) clearTimeout(this.ringing.timer)
    this.ringing = null
    this.synth.dispose()
    this.filter.dispose()
    this.reverb.dispose()
  }
}
