import type { FingerVector } from '../hand/fingers'

export interface ChordDef {
  id: string
  label: string
  /** 코드를 구성하는 음 (Tone.js 음이름) */
  notes: string[]
}

export const CHORDS: ChordDef[] = [
  { id: 'C', label: 'C', notes: ['C4', 'E4', 'G4'] },
  { id: 'G', label: 'G', notes: ['G3', 'B3', 'D4'] },
  { id: 'Am', label: 'Am', notes: ['A3', 'C4', 'E4'] },
  { id: 'F', label: 'F', notes: ['F3', 'A3', 'C4'] },
  { id: 'Em', label: 'Em', notes: ['E3', 'G3', 'B3'] },
  { id: 'D', label: 'D', notes: ['D4', 'F#4', 'A4'] },
]

export type Templates = Record<string, FingerVector>

/** 임시 기본 템플릿 [엄지, 검지, 중지, 약지, 새끼]. 캘리브레이션(5단계)에서 사용자가 덮어쓴다. */
export const DEFAULT_TEMPLATES: Templates = {
  C: [0, 1, 0, 0, 0],
  G: [0, 1, 1, 0, 0],
  Am: [0, 1, 1, 1, 0],
  F: [0, 1, 1, 1, 1],
  Em: [1, 1, 0, 0, 0],
  D: [1, 0, 0, 0, 1],
}
