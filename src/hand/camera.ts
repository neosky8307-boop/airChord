export interface CameraInfo {
  id: string
  label: string
}

const BASE_VIDEO = { width: 640, height: 480, frameRate: { ideal: 60 } }

/**
 * 선택한 카메라를 연다. 저장된 카메라가 없어졌으면(분리/변경) 기본 카메라로 자동 전환하고 fellBack=true.
 * 권한 거부 등 다른 오류는 그대로 던진다.
 */
export async function openCamera(deviceId: string | null): Promise<{ stream: MediaStream; fellBack: boolean }> {
  if (deviceId) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { ...BASE_VIDEO, deviceId: { exact: deviceId } },
        audio: false,
      })
      return { stream, fellBack: false }
    } catch (e) {
      const name = e instanceof DOMException ? e.name : ''
      if (name !== 'OverconstrainedError' && name !== 'NotFoundError') throw e
    }
  }
  const stream = await navigator.mediaDevices.getUserMedia({ video: BASE_VIDEO, audio: false })
  return { stream, fellBack: deviceId !== null }
}

/** 카메라 목록. 권한을 받기 전에는 label이 비어 있어 번호로 대신한다. */
export async function listCameras(): Promise<CameraInfo[]> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    return devices
      .filter((d) => d.kind === 'videoinput' && d.deviceId)
      .map((d, i) => ({ id: d.deviceId, label: d.label || `카메라 ${i + 1}` }))
  } catch {
    return []
  }
}
