import { afterEach, describe, expect, it, vi } from 'vitest'
import { listCameras, openCamera } from './camera'

const STREAM = { id: 'stream' } as unknown as MediaStream

function stubMedia(getUserMedia: ReturnType<typeof vi.fn>, enumerateDevices?: ReturnType<typeof vi.fn>) {
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia, enumerateDevices } })
}

afterEach(() => vi.unstubAllGlobals())

describe('openCamera', () => {
  it('deviceId가 없으면 기본 카메라를 연다', async () => {
    const gum = vi.fn().mockResolvedValue(STREAM)
    stubMedia(gum)
    expect(await openCamera(null)).toEqual({ stream: STREAM, fellBack: false })
    expect(gum).toHaveBeenCalledTimes(1)
    expect(gum.mock.calls[0][0].video.deviceId).toBeUndefined()
  })

  it('deviceId가 있으면 exact로 요청한다', async () => {
    const gum = vi.fn().mockResolvedValue(STREAM)
    stubMedia(gum)
    expect(await openCamera('cam-2')).toEqual({ stream: STREAM, fellBack: false })
    expect(gum.mock.calls[0][0].video.deviceId).toEqual({ exact: 'cam-2' })
  })

  it('저장된 카메라가 없어졌으면 기본 카메라로 폴백하고 알린다', async () => {
    const gum = vi
      .fn()
      .mockRejectedValueOnce(new DOMException('gone', 'OverconstrainedError'))
      .mockResolvedValueOnce(STREAM)
    stubMedia(gum)
    expect(await openCamera('old-cam')).toEqual({ stream: STREAM, fellBack: true })
    expect(gum).toHaveBeenCalledTimes(2)
    expect(gum.mock.calls[1][0].video.deviceId).toBeUndefined()
  })

  it('NotFoundError도 폴백한다', async () => {
    const gum = vi.fn().mockRejectedValueOnce(new DOMException('x', 'NotFoundError')).mockResolvedValueOnce(STREAM)
    stubMedia(gum)
    expect((await openCamera('old-cam')).fellBack).toBe(true)
  })

  it('권한 거부는 폴백하지 않고 그대로 던진다', async () => {
    const gum = vi.fn().mockRejectedValue(new DOMException('no', 'NotAllowedError'))
    stubMedia(gum)
    await expect(openCamera('cam-2')).rejects.toMatchObject({ name: 'NotAllowedError' })
    expect(gum).toHaveBeenCalledTimes(1)
  })

  it('기본 카메라도 없으면 그 오류를 던진다', async () => {
    const gum = vi.fn().mockRejectedValue(new DOMException('none', 'NotFoundError'))
    stubMedia(gum)
    await expect(openCamera(null)).rejects.toMatchObject({ name: 'NotFoundError' })
  })
})

describe('listCameras', () => {
  it('비디오 입력만 골라 이름을 붙인다 (label이 없으면 번호)', async () => {
    stubMedia(
      vi.fn(),
      vi.fn().mockResolvedValue([
        { kind: 'videoinput', deviceId: 'a', label: 'Front Cam' },
        { kind: 'audioinput', deviceId: 'm', label: 'Mic' },
        { kind: 'videoinput', deviceId: 'b', label: '' },
      ]),
    )
    expect(await listCameras()).toEqual([
      { id: 'a', label: 'Front Cam' },
      { id: 'b', label: '카메라 2' },
    ])
  })

  it('enumerateDevices가 실패하면 빈 목록', async () => {
    stubMedia(vi.fn(), vi.fn().mockRejectedValue(new Error('x')))
    expect(await listCameras()).toEqual([])
  })

  it('mediaDevices가 없는 환경에서도 죽지 않는다', async () => {
    vi.stubGlobal('navigator', {})
    expect(await listCameras()).toEqual([])
  })
})
