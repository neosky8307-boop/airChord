import { useEffect, useRef } from 'react'
import { live } from '../hand/live'
import { useAppStore } from '../store/useAppStore'

/** 순간 인식값(안정화 전)과 확정 코드. 순간값은 DOM 직접 갱신. */
export function ChordStatus() {
  const confirmed = useAppStore((s) => s.confirmedChord)
  const instant = useRef<HTMLSpanElement>(null)
  const latency = useRef<HTMLSpanElement>(null)
  const strumEl = useRef<HTMLSpanElement>(null)
  const pianoEl = useRef<HTMLSpanElement>(null)
  const mode = useAppStore((s) => s.mode)

  useEffect(() => {
    let raf = 0
    const tick = () => {
      const m = live.match
      if (instant.current)
        instant.current.textContent = m ? `${m.id} (신뢰도 ${(m.confidence * 100).toFixed(0)}%)` : '-'
      if (strumEl.current) {
        const ls = live.lastStrum
        const flash = ls && performance.now() - ls.at < 350 ? (ls.direction === 'down' ? '↓' : '↑') : '·'
        strumEl.current.textContent = `${flash} (속도 ${live.strumSpeed.toFixed(1)})`
      }
      if (pianoEl.current) {
        const ln = live.lastNote
        const flash = ln && performance.now() - ln.at < 600 ? ln.note : '·'
        const { speed, bend } = live.pianoStats
        pianoEl.current.textContent = `${flash} (하강 ${speed.toFixed(1)}, 굽힘 ${bend.toFixed(1)})`
      }
      if (latency.current)
        latency.current.textContent = live.latencyMs == null ? '-' : `${live.latencyMs.toFixed(0)}ms`
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <>
      <span>확정 코드: <b>{confirmed ?? '-'}</b></span>
      <span>순간 인식: <span ref={instant}>-</span></span>
      <span>지연: <span ref={latency}>-</span></span>
      {mode === 'piano' && <span>피아노: <span ref={pianoEl}>-</span></span>}
      {mode === 'strum' && <span>스트럼: <span ref={strumEl}>-</span></span>}
    </>
  )
}
