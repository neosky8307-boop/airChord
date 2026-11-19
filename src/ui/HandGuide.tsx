import { handGuideShapes, PALM, GUIDE_VIEWBOX } from '../chords/handGuide'
import type { FingerVector } from '../hand/fingers'

/** 템플릿 값으로 그린 손 모양. 펴진 손가락은 파랗게, 접힌 손가락은 어둡고 짧게 보인다. */
export function HandGuide({ template, thumbRight, title }: { template: FingerVector; thumbRight: boolean; title?: string }) {
  const shapes = handGuideShapes(template)
  return (
    <svg
      className="hand"
      viewBox={`0 0 ${GUIDE_VIEWBOX.width} ${GUIDE_VIEWBOX.height}`}
      role="img"
      aria-label={title}
    >
      {title && <title>{title}</title>}
      {/* 엄지가 오른쪽인 배치를 기준으로 그리고, 왼쪽이면 통째로 좌우 반전한다 */}
      <g transform={thumbRight ? undefined : `translate(${GUIDE_VIEWBOX.width} 0) scale(-1 1)`}>
        <rect className="palm" x={PALM.x} y={PALM.y} width={PALM.width} height={PALM.height} rx={PALM.radius} />
        {shapes.map((f) => (
          <rect
            key={f.name}
            className={f.ext >= 0.5 ? 'finger up' : 'finger down'}
            x={-f.width / 2}
            y={-f.length}
            width={f.width}
            height={f.length}
            rx={f.width / 2}
            opacity={0.5 + 0.5 * f.ext}
            transform={`translate(${f.x} ${f.y}) rotate(${f.angle})`}
          />
        ))}
      </g>
    </svg>
  )
}
