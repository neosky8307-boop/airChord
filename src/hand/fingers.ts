import type { Landmark } from './types'

/** 엄지, 검지, 중지, 약지, 새끼 순서의 펴짐 정도 (0=완전히 굽힘, 1=완전히 폄). */
export const FINGER_NAMES = ['thumb', 'index', 'middle', 'ring', 'pinky'] as const
export type FingerName = (typeof FINGER_NAMES)[number]
export type FingerVector = [number, number, number, number, number]

/** MediaPipe 랜드마크 인덱스 */
const WRIST = 0
const THUMB_TIP = 4
const INDEX_MCP = 5
const PINKY_MCP = 17
/** 검지~새끼의 [첫마디(MCP), 손끝(TIP)] */
const FINGER_JOINTS: Record<Exclude<FingerName, 'thumb'>, [number, number]> = {
  index: [5, 8],
  middle: [9, 12],
  ring: [13, 16],
  pinky: [17, 20],
}

export interface Range {
  /** 이 비율 이하면 0 (굽힘) */
  curl: number
  /** 이 비율 이상이면 1 (폄) */
  open: number
}

/**
 * 비율 → 0~1 변환 범위. 손 크기에 따라 달라질 수 있는 추정값이라
 * 실제 카메라로 확인하며 조정한다. (캘리브레이션 템플릿은 이 정규화 값을 기준으로 저장)
 * - 검지~새끼: 손목-손끝 거리 / 손목-첫마디 거리
 * - 엄지: 엄지끝-새끼 첫마디 거리 / 손바닥 폭(검지 첫마디-새끼 첫마디)
 */
export const DEFAULT_RANGES: Record<FingerName, Range> = {
  thumb: { curl: 0.7, open: 1.5 },
  index: { curl: 1.0, open: 1.9 },
  middle: { curl: 1.0, open: 1.9 },
  ring: { curl: 1.0, open: 1.9 },
  pinky: { curl: 1.0, open: 1.8 },
}

export interface ExtensionOptions {
  /** 영상 가로/세로 비율. 정규화 좌표의 x,y 스케일 차이를 보정한다. (기본 1) */
  aspect?: number
  ranges?: Record<FingerName, Range>
}

function dist(a: Landmark, b: Landmark, aspect: number): number {
  // x와 z는 이미지 너비 기준으로 정규화되어 있으므로 aspect를 곱해 y와 단위를 맞춘다.
  const dx = (a.x - b.x) * aspect
  const dy = a.y - b.y
  const dz = (a.z - b.z) * aspect
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

function normalize(value: number, { curl, open }: Range): number {
  const t = (value - curl) / (open - curl)
  return Math.min(1, Math.max(0, t))
}

/** 원시 비율 5개 (정규화 전). 디버깅과 범위 튜닝용. */
export function fingerRatios(landmarks: Landmark[], aspect = 1): FingerVector {
  const wrist = landmarks[WRIST]
  const ratios = FINGER_NAMES.map((name) => {
    if (name === 'thumb') {
      const palmWidth = dist(landmarks[INDEX_MCP], landmarks[PINKY_MCP], aspect)
      return palmWidth === 0 ? 0 : dist(landmarks[THUMB_TIP], landmarks[PINKY_MCP], aspect) / palmWidth
    }
    const [mcp, tip] = FINGER_JOINTS[name]
    const base = dist(wrist, landmarks[mcp], aspect)
    return base === 0 ? 0 : dist(wrist, landmarks[tip], aspect) / base
  })
  return ratios as FingerVector
}

/** 손가락 5개의 펴짐 정도(0~1). 손 회전/거리에 거의 영향받지 않는다. */
export function fingerExtensions(landmarks: Landmark[], options: ExtensionOptions = {}): FingerVector {
  const { aspect = 1, ranges = DEFAULT_RANGES } = options
  const ratios = fingerRatios(landmarks, aspect)
  return ratios.map((r, i) => normalize(r, ranges[FINGER_NAMES[i]])) as FingerVector
}
