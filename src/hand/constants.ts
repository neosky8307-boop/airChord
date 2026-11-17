// 나중에 오프라인 번들로 바꿀 때 이 두 상수만 로컬 경로로 교체하면 된다.
// 예) WASM_BASE_URL = '/mediapipe/wasm', HAND_MODEL_URL = '/models/hand_landmarker.task'
// wasm 버전은 설치된 @mediapipe/tasks-vision 버전과 반드시 같아야 한다.
// (constants.test.ts가 package.json과 일치하는지 검사한다.)
export const MEDIAPIPE_VERSION = '1.2.3'
export const WASM_BASE_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`
export const HAND_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'
