import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import { HAND_MODEL_URL, WASM_BASE_URL } from './constants'
import type { Handedness, HandFrame } from './types'

const flip = (h: Handedness): Handedness => (h === 'Left' ? 'Right' : 'Left')

export interface HandTracker {
  detect(video: HTMLVideoElement, timestamp: number): HandFrame
  close(): void
}

export class ModelLoadError extends Error {}

/** 스크립트/파일 로드 실패는 Error가 아니라 Event로 던져지는 경우가 있어 사람이 읽을 문구로 바꾼다. */
function describeError(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof Event !== 'undefined' && e instanceof Event) {
    const src = (e.target as { src?: string } | null)?.src
    return `파일을 불러오지 못했습니다${src ? `: ${src}` : ''}`
  }
  return String(e)
}

export async function createHandTracker(): Promise<HandTracker> {
  let landmarker: HandLandmarker | undefined
  try {
    const fileset = await FilesetResolver.forVisionTasks(WASM_BASE_URL)
    // GPU가 안 되는 환경에서도 동작하도록 실패하면 CPU로 폴백한다.
    let lastError: unknown
    for (const delegate of ['GPU', 'CPU'] as const) {
      try {
        landmarker = await HandLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: HAND_MODEL_URL, delegate },
          runningMode: 'VIDEO',
          numHands: 2,
        })
        break
      } catch (e) {
        lastError = e
      }
    }
    if (!landmarker) throw lastError
  } catch (e) {
    throw new ModelLoadError(describeError(e))
  }
  const tracker = landmarker

  return {
    detect(video, timestamp) {
      const r = tracker.detectForVideo(video, timestamp)
      return {
        timestamp,
        hands: r.landmarks.map((lm, i) => ({
          landmarks: lm.map(({ x, y, z }) => ({ x, y, z })),
          // MediaPipe는 셀피(좌우 반전) 영상을 가정해 라벨을 붙인다.
          // 우리는 반전하지 않은 원본 프레임을 넣으므로 실제 손과 반대로 나온다 → 뒤집는다.
          handedness: flip((r.handedness[i]?.[0]?.categoryName ?? 'Right') as Handedness),
          score: r.handedness[i]?.[0]?.score ?? 0,
        })),
      }
    },
    close: () => tracker.close(),
  }
}
