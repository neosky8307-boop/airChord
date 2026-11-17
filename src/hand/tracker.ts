import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import { HAND_MODEL_URL, WASM_BASE_URL } from './constants'
import type { HandFrame } from './types'

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
          handedness: (r.handedness[i]?.[0]?.categoryName ?? 'Right') as 'Left' | 'Right',
          score: r.handedness[i]?.[0]?.score ?? 0,
        })),
      }
    },
    close: () => landmarker.close(),
  }
}
