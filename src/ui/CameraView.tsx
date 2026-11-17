import { useEffect, useRef } from 'react'
import { createHandTracker, ModelLoadError, type HandTracker } from '../hand/tracker'
import { HAND_CONNECTIONS } from '../hand/connections'
import type { HandFrame } from '../hand/types'
import { useAppStore } from '../store/useAppStore'

function cameraErrorMessage(e: unknown): string {
  const name = e instanceof DOMException ? e.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError')
    return '카메라 권한이 거부되었습니다. 브라우저 주소창의 카메라 아이콘에서 권한을 허용한 뒤 다시 시작하세요.'
  if (name === 'NotFoundError' || name === 'OverconstrainedError')
    return '사용 가능한 카메라를 찾지 못했습니다. 카메라 연결을 확인하세요.'
  if (name === 'NotReadableError')
    return '카메라를 사용할 수 없습니다. 다른 앱이 카메라를 점유 중인지 확인하세요.'
  return `카메라를 시작하지 못했습니다: ${e instanceof Error ? e.message : String(e)}`
}

function draw(ctx: CanvasRenderingContext2D, frame: HandFrame, w: number, h: number) {
  ctx.clearRect(0, 0, w, h)
  for (const hand of frame.hands) {
    const color = hand.handedness === 'Left' ? '#4ade80' : '#60a5fa'
    ctx.strokeStyle = color
    ctx.lineWidth = 3
    ctx.beginPath()
    for (const { start, end } of HAND_CONNECTIONS) {
      const a = hand.landmarks[start]
      const b = hand.landmarks[end]
      ctx.moveTo(a.x * w, a.y * h)
      ctx.lineTo(b.x * w, b.y * h)
    }
    ctx.stroke()
    ctx.fillStyle = '#fff'
    for (const p of hand.landmarks) {
      ctx.beginPath()
      ctx.arc(p.x * w, p.y * h, 4, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

/** 카메라 + 추론 + 렌더링을 rAF 루프 하나로 처리. 랜드마크는 React state에 넣지 않는다. */
export function CameraView({ running }: { running: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mirror = useAppStore((s) => s.mirror)

  useEffect(() => {
    if (!running) return
    const { setStatus, setStats } = useAppStore.getState()
    let cancelled = false
    let raf = 0
    let tracker: HandTracker | null = null
    let stream: MediaStream | null = null

    ;(async () => {
      setStatus('loading')
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, frameRate: { ideal: 60 } },
          audio: false,
        })
      } catch (e) {
        return setStatus('error', cameraErrorMessage(e))
      }
      try {
        tracker = await createHandTracker()
      } catch (e) {
        stream.getTracks().forEach((t) => t.stop())
        const detail = e instanceof ModelLoadError ? e.message : String(e)
        return setStatus('error', `손 인식 모델을 불러오지 못했습니다. 네트워크를 확인하세요. (${detail})`)
      }
      if (cancelled) return
      const video = videoRef.current!
      const canvas = canvasRef.current!
      const ctx = canvas.getContext('2d')!
      video.srcObject = stream
      await video.play()
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      setStatus('running')

      let lastVideoTime = -1
      let frames = 0
      let windowStart = performance.now()
      let handCount = 0

      const loop = () => {
        if (cancelled) return
        if (video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime
          const frame = tracker!.detect(video, performance.now())
          draw(ctx, frame, canvas.width, canvas.height)
          handCount = frame.hands.length
          frames++
        }
        const now = performance.now()
        if (now - windowStart >= 500) {
          setStats(Math.round((frames * 1000) / (now - windowStart)), handCount)
          frames = 0
          windowStart = now
        }
        raf = requestAnimationFrame(loop)
      }
      raf = requestAnimationFrame(loop)
    })()

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      tracker?.close()
      stream?.getTracks().forEach((t) => t.stop())
      if (videoRef.current) videoRef.current.srcObject = null
      useAppStore.getState().setStatus('idle')
    }
  }, [running])

  return (
    <div className="camera" style={{ transform: mirror ? 'scaleX(-1)' : undefined }}>
      <video ref={videoRef} playsInline muted />
      <canvas ref={canvasRef} />
    </div>
  )
}
