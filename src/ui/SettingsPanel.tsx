import { useEffect, useState } from 'react'
import { listCameras, type CameraInfo } from '../hand/camera'
import { NUMERIC_RANGES, type NumericSettingKey } from '../settings/settings'
import { useAppStore } from '../store/useAppStore'

function useCameras(refreshKey: unknown): CameraInfo[] {
  const [cameras, setCameras] = useState<CameraInfo[]>([])
  useEffect(() => {
    let alive = true
    const refresh = () => listCameras().then((c) => alive && setCameras(c))
    refresh()
    navigator.mediaDevices?.addEventListener?.('devicechange', refresh)
    return () => {
      alive = false
      navigator.mediaDevices?.removeEventListener?.('devicechange', refresh)
    }
    // 권한을 받은 뒤(status가 running이 된 뒤)에야 카메라 이름이 보이므로 다시 읽는다.
  }, [refreshKey])
  return cameras
}

const NUMERIC_KEYS = Object.keys(NUMERIC_RANGES) as NumericSettingKey[]

export function SettingsPanel() {
  const s = useAppStore()
  const cameras = useCameras(s.status)
  const selected = cameras.some((c) => c.id === s.cameraId) ? (s.cameraId as string) : ''

  return (
    <details className="settings">
      <summary>설정</summary>

      <div className="set-row">
        <label htmlFor="cam">카메라</label>
        <select id="cam" value={selected} onChange={(e) => s.setSetting('cameraId', e.target.value || null)}>
          <option value="">기본 카메라</option>
          {cameras.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
        <small>카메라를 바꾸면 재시작됩니다.</small>
      </div>

      <div className="set-row">
        <label htmlFor="mirror">좌우 반전 표시</label>
        <input id="mirror" type="checkbox" checked={s.mirror} onChange={(e) => s.setSetting('mirror', e.target.checked)} />
      </div>

      <div className="set-row">
        <label htmlFor="hand">코드 손모양을 읽는 손</label>
        <select id="hand" value={s.chordHand} onChange={(e) => s.setSetting('chordHand', e.target.value as 'Left' | 'Right')}>
          <option value="Left">왼손 (오른손은 스트럼)</option>
          <option value="Right">오른손 (왼손은 스트럼)</option>
        </select>
      </div>

      {NUMERIC_KEYS.map((key) => {
        const r = NUMERIC_RANGES[key]
        return (
          <div className="set-row" key={key}>
            <label htmlFor={key}>{r.label}</label>
            <input
              id={key}
              type="range"
              min={r.min}
              max={r.max}
              step={r.step}
              value={s[key]}
              onChange={(e) => s.setSetting(key, Number(e.target.value))}
            />
            <output>{s[key]}</output>
            <small>{r.hint}</small>
          </div>
        )
      })}

      <button className="secondary" onClick={s.resetSettings}>설정 초기화</button>
    </details>
  )
}
