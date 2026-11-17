import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import { HAND_MODEL_URL, WASM_BASE_URL } from './constants'
import type { Handedness, HandFrame } from './types'

const flip = (h: Handedness): Handedness => (h === 'Left' ? 'Right' : 'Left')

export interface HandTracker {
  detect(video: HTMLVideoElement, timestamp: number): HandFrame
  close(): void
}

export class ModelLoadError extends Error {}

export async function createHandTracker(): Promise<HandTracker> {
  let landmarker: HandLandmarker
  try {
    const fileset = await FilesetResolver.forVisionTasks(WASM_BASE_URL)
    landmarker = await HandLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: HAND_MODEL_URL, delegate: 'GPU' },
      runningMode: 'VIDEO',
      numHands: 2,
    })
  } catch (e) {
    throw new ModelLoadError(e instanceof Error ? e.message : String(e))
  }

  return {
    detect(video, timestamp) {
      const r = landmarker.detectForVideo(video, timestamp)
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
    close: () => landmarker.close(),
  }
}
