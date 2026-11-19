import { CHORDS, DEFAULT_TEMPLATES } from '../chords/definitions'
import { noteNames, thumbOnRight } from '../chords/handGuide'
import { useAppStore } from '../store/useAppStore'
import { HandGuide } from './HandGuide'

const TIP: Record<'chord' | 'strum', string> = {
  chord: '아래 손모양을 만들면 코드가 연주됩니다.',
  strum: '아래 손모양으로 코드를 고르고, 반대 손을 위아래로 쓸어 연주하세요.',
}

/** 좌측 패널: 코드 목록과 코드별 손가락 모양. 현재 확정된 코드는 하이라이트된다. */
export function ChordGuide() {
  const mode = useAppStore((s) => s.mode)
  const confirmed = useAppStore((s) => s.confirmedChord)
  const selected = useAppStore((s) => s.selectedChord)
  const setSelected = useAppStore((s) => s.setSelectedChord)
  const templates = useAppStore((s) => s.templates)
  const chordHand = useAppStore((s) => s.chordHand)
  const mirror = useAppStore((s) => s.mirror)
  const handLabel = chordHand === 'Left' ? '왼손' : '오른손'

  if (mode === 'piano') {
    return (
      <aside className="guide">
        <h2>에어 피아노</h2>
        <p className="tip">
          화면 아래 건반 위에서 손가락을 굽혀 내리면 그 건반이 울립니다. 양손 모두 사용할 수 있어요.
          코드 가이드는 코드 손모양/스트럼 모드에서 볼 수 있습니다.
        </p>
      </aside>
    )
  }

  const right = thumbOnRight(chordHand, mirror)
  return (
    <aside className="guide">
      <h2>코드 가이드 ({handLabel})</h2>
      <p className="tip">{TIP[mode]}</p>
      <div className="cards">
        {CHORDS.map((c) => {
          const template = templates[c.id]
          const custom = template.some((v, i) => v !== DEFAULT_TEMPLATES[c.id][i])
          const cls = ['card', c.id === confirmed ? 'on' : '', c.id === selected ? 'sel' : ''].join(' ').trim()
          return (
            <button
              key={c.id}
              className={cls}
              onClick={() => setSelected(c.id)}
              aria-pressed={c.id === confirmed}
              title="클릭하면 캘리브레이션 대상으로 선택됩니다"
            >
              <HandGuide template={template} thumbRight={right} title={`${c.label} 손모양`} />
              <span className="name">{c.label}</span>
              <span className="notes">{noteNames(c.notes)}</span>
              {custom && <span className="badge">내 손모양</span>}
            </button>
          )
        })}
      </div>
    </aside>
  )
}
