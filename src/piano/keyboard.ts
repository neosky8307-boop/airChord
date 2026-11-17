/** 가상 건반 배치와 좌표 변환. 좌표는 모두 "화면에 보이는(표시) 기준"의 정규화 좌표(0~1). */

export const PIANO_NOTES = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5']

export interface KeyboardRect {
  left: number
  right: number
  top: number
  bottom: number
}

/** 화면 아래쪽에 가로로 넓게 깐다. */
export const DEFAULT_RECT: KeyboardRect = { left: 0.04, right: 0.96, top: 0.6, bottom: 0.98 }

export interface PianoKey {
  note: string
  x0: number
  x1: number
}

export function layoutKeys(notes: string[] = PIANO_NOTES, rect: KeyboardRect = DEFAULT_RECT): PianoKey[] {
  const w = (rect.right - rect.left) / notes.length
  return notes.map((note, i) => ({ note, x0: rect.left + w * i, x1: rect.left + w * (i + 1) }))
}

/** 점이 건반 영역 밖이면 null. */
export function keyAtPoint(
  x: number,
  y: number,
  notes: string[] = PIANO_NOTES,
  rect: KeyboardRect = DEFAULT_RECT,
): PianoKey | null {
  if (x < rect.left || x >= rect.right || y < rect.top || y > rect.bottom) return null
  const keys = layoutKeys(notes, rect)
  const i = Math.min(notes.length - 1, Math.floor(((x - rect.left) / (rect.right - rect.left)) * notes.length))
  return keys[i]
}

/** 카메라 원본 x를 화면 표시 x로. 좌우 반전 표시일 때는 뒤집는다. */
export function toDisplayX(x: number, mirror: boolean): number {
  return mirror ? 1 - x : x
}
