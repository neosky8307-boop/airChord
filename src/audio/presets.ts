/** 음색 프리셋. Tone.js에 의존하지 않는 순수 데이터라 설정/테스트에서 가져다 쓴다. */

export const TONE_IDS = ['soft', 'piano', 'pad', 'organ', 'guitar'] as const
export type ToneId = (typeof TONE_IDS)[number]

export interface TonePreset {
  id: ToneId
  label: string
  hint: string
  oscillator: { type: string; count?: number; spread?: number }
  /** attack/decay/release는 초, sustain은 0~1 */
  envelope: { attack: number; decay: number; sustain: number; release: number }
  /** 로우패스 필터 차단 주파수 (Hz). 낮을수록 부드럽고 어둡다. */
  cutoff: number
  /** 리버브 섞이는 정도 0~1 */
  reverb: number
  /** 음량 보정 (dB). 프리셋마다 파형 크기가 달라 소리 크기를 맞춘다. */
  volume: number
}

export const DEFAULT_TONE: ToneId = 'soft'

export const TONE_PRESETS: Record<ToneId, TonePreset> = {
  soft: {
    id: 'soft',
    label: '부드러운 신스',
    hint: '둥글고 깨끗한 소리. 코드를 잡고 있는 동안 계속 울린다.',
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.01, decay: 0.5, sustain: 0.6, release: 1.8 },
    cutoff: 4000,
    reverb: 0.2,
    volume: -8,
  },
  piano: {
    id: 'piano',
    label: '피아노 느낌',
    hint: '또렷하게 시작해 서서히 사라지는 여운이 긴 소리.',
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.003, decay: 3, sustain: 0.18, release: 1.6 },
    cutoff: 3500,
    reverb: 0.2,
    volume: -6,
  },
  pad: {
    id: 'pad',
    label: '따뜻한 패드',
    hint: '천천히 차오르는 두툼한 소리. 잔잔한 곡에 어울린다.',
    oscillator: { type: 'fatsawtooth', count: 3, spread: 18 },
    envelope: { attack: 0.25, decay: 0.6, sustain: 0.85, release: 2.5 },
    cutoff: 1400,
    reverb: 0.35,
    volume: -9,
  },
  organ: {
    id: 'organ',
    label: '오르간',
    hint: '누르는 동안 크기가 일정한 소리.',
    oscillator: { type: 'fatsquare', count: 2, spread: 8 },
    envelope: { attack: 0.02, decay: 0.1, sustain: 0.9, release: 0.4 },
    cutoff: 2200,
    reverb: 0.2,
    volume: -12,
  },
  guitar: {
    id: 'guitar',
    label: '기타 느낌',
    hint: '튕기는 느낌으로 빠르게 줄어드는 소리 (근사치).',
    oscillator: { type: 'sawtooth' },
    envelope: { attack: 0.002, decay: 2, sustain: 0.12, release: 1.2 },
    cutoff: 2600,
    reverb: 0.15,
    volume: -8,
  },
}

export function isToneId(v: unknown): v is ToneId {
  return typeof v === 'string' && (TONE_IDS as readonly string[]).includes(v)
}
