import { useEffect, useRef } from 'react'
import { FINGER_NAMES } from '../hand/fingers'
import { live } from '../hand/live'
import type { Handedness } from '../hand/types'

const LABEL: Record<(typeof FINGER_NAMES)[number], string> = {
  thumb: '엄지', index: '검지', middle: '중지', ring: '약지', pinky: '새끼',
}

/** 손가락 펴짐 막대. rAF로 DOM을 직접 갱신해 React 리렌더링이 없다. */
export function FingerBars({ hand, title }: { hand: Handedness; title: string }) {
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let raf = 0
    const tick = () => {
      const data = live.fingers[hand]
      const rows = root.current?.children
      if (rows) {
        for (let i = 0; i < FINGER_NAMES.length; i++) {
          const row = rows[i + 1] as HTMLElement
          const bar = row.querySelector<HTMLElement>('.fill')!
          const num = row.querySelector<HTMLElement>('.num')!
          bar.style.width = data ? `${data.ext[i] * 100}%` : '0%'
          num.textContent = data ? `${data.ext[i].toFixed(2)} (${data.ratios[i].toFixed(2)})` : '-'
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [hand])

  return (
    <div className="bars" ref={root}>
      <h3>{title}</h3>
      {FINGER_NAMES.map((n) => (
        <div className="row" key={n}>
          <span className="name">{LABEL[n]}</span>
          <span className="track"><span className="fill" /></span>
          <span className="num">-</span>
        </div>
      ))}
    </div>
  )
}
