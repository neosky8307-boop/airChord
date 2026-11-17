import { useEffect, useRef, useState } from 'react'
import { TemplateRecorder } from '../chords/calibration'
import { CHORDS, DEFAULT_TEMPLATES } from '../chords/definitions'
import { FINGER_NAMES } from '../hand/fingers'
import { live } from '../hand/live'
import { useAppStore } from '../store/useAppStore'

const FINGER_LABEL = ['엄지', '검지', '중지', '약지', '새끼']

export function CalibrationPanel() {
  const [chordId, setChordId] = useState(CHORDS[0].id)
  const status = useAppStore((s) => s.status)
  const calibrating = useAppStore((s) => s.calibrating)
  const message = useAppStore((s) => s.calibrationMessage)
  const template = useAppStore((s) => s.templates[chordId])
  const chordHand = useAppStore((s) => s.chordHand)
  const progress = useRef<HTMLSpanElement>(null)

  // 녹화 진행 상태는 프레임 단위로 바뀌므로 DOM을 직접 갱신한다.
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const rec = live.recorder
      if (progress.current) {
        const now = performance.now()
        progress.current.textContent = !rec
          ? ''
          : rec.phase(now) === 'prep'
            ? `${rec.chordId} 손모양을 만드세요… ${(rec.prepRemaining(now) / 1000).toFixed(1)}초 뒤 녹화`
            : `${rec.chordId} 녹화 중… ${Math.round(rec.progress(now) * 100)}%`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const start = () => {
    live.recorder = new TemplateRecorder(chordId, performance.now())
    useAppStore.getState().setCalibrating(chordId)
  }

  const isDefault = template.every((v, i) => v === DEFAULT_TEMPLATES[chordId][i])

  return (
    <div className="calib">
      <h3>캘리브레이션 ({chordHand === 'Left' ? '왼손' : '오른손'}으로 녹화)</h3>
      <div className="calib-row">
        <select value={chordId} onChange={(e) => setChordId(e.target.value)} disabled={!!calibrating}>
          {CHORDS.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
        <button onClick={start} disabled={status !== 'running' || !!calibrating}>녹화</button>
        <button className="secondary" onClick={() => useAppStore.getState().resetTemplate(chordId)} disabled={isDefault || !!calibrating}>
          기본값으로
        </button>
      </div>
      <div className="calib-tpl">
        {FINGER_NAMES.map((_, i) => (
          <span key={i}>{FINGER_LABEL[i]} {template[i].toFixed(2)}</span>
        ))}
        <em>{isDefault ? '기본값' : '사용자 지정'}</em>
      </div>
      {status !== 'running' && <p className="hint">카메라를 시작하면 녹화할 수 있습니다.</p>}
      <span className="rec" ref={progress} />
      {message && !calibrating && <p className="hint">{message}</p>}
    </div>
  )
}
