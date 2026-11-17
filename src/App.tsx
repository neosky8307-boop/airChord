import { useState } from 'react'
import { CameraView } from './ui/CameraView'
import { FingerBars } from './ui/FingerBars'
import { useAppStore } from './store/useAppStore'

export default function App() {
  const [running, setRunning] = useState(false)
  const { status, error, fps, handCount } = useAppStore()

  return (
    <div className="app">
      <header>
        <h1>Air Chord</h1>
        <button onClick={() => setRunning((r) => !r)}>{running ? '정지' : '시작'}</button>
      </header>
      <main>
        <CameraView running={running} />
        <div className="bars-wrap">
          <FingerBars hand="Left" title="왼손 (펴짐 / 원시 비율)" />
          <FingerBars hand="Right" title="오른손 (펴짐 / 원시 비율)" />
        </div>
        {status === 'loading' && <p className="msg">카메라와 모델을 준비하는 중…</p>}
        {status === 'error' && <p className="msg error">{error}</p>}
      </main>
      <footer>
        <span>상태: {status}</span>
        <span>FPS: {fps}</span>
        <span>감지된 손: {handCount}</span>
      </footer>
    </div>
  )
}
