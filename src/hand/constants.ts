// 나중에 오프라인 번들로 바꿀 때 이 두 상수만 로컬 경로로 교체하면 된다.
// 예) WASM_BASE_URL = '/mediapipe/wasm', HAND_MODEL_URL = '/models/hand_landmarker.task'
export const WASM_BASE_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm'
export const HAND_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'
