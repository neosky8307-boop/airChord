import { describe, expect, it } from 'vitest'
import pkgRaw from '../../node_modules/@mediapipe/tasks-vision/package.json?raw'
import { MEDIAPIPE_VERSION, WASM_BASE_URL } from './constants'

describe('MediaPipe 버전', () => {
  it('wasm 버전이 설치된 @mediapipe/tasks-vision 패키지 버전과 같다', () => {
    const pkg = JSON.parse(pkgRaw)
    expect(MEDIAPIPE_VERSION).toBe(pkg.version)
    expect(WASM_BASE_URL).toContain(`@${pkg.version}/wasm`)
  })
})
