import { useEffect, useRef } from 'react'
import { createHandTracker, ModelLoadError, type HandTracker } from '../hand/tracker'
import { HAND_CONNECTIONS } from '../hand/connections'
import type { HandFrame } from '../hand/types'
import { ChordTrigger } from '../audio/trigger'
import { outputLatencyMs, playChord, stopAudio } from '../audio/engine'
import { matchChord, Stabilizer } from '../chords/matching'
import { handScale, StrumDetector } from '../chords/strum'
import { fingerExtensions, fingerRatios } from '../hand/fingers'
import { live } from '../hand/live'
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

      const stabilizer = new Stabilizer(useAppStore.getState().stableFrames)
      const trigger = new ChordTrigger()
      const strum = new StrumDetector()
      let lastMode = useAppStore.getState().mode
      let candidateId: string | null = null
      let candidateSince = 0
      let lastVideoTime = -1
      let frames = 0
      let windowStart = performance.now()
      let handCount = 0

      const loop = () => {
        if (cancelled) return
        if (video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime
          const frameTime = performance.now()
          const frame = tracker!.detect(video, frameTime)
          draw(ctx, frame, canvas.width, canvas.height)
          const aspect = canvas.width / canvas.height
          live.fingers = {}
          for (const hand of frame.hands) {
            live.fingers[hand.handedness] = {
              ext: fingerExtensions(hand.landmarks, { aspect }),
              ratios: fingerRatios(hand.landmarks, aspect),
            }
          }
          const st = useAppStore.getState()
          if (st.mode !== lastMode) {
            lastMode = st.mode
            trigger.reset()
            strum.reset()
            live.strumSpeed = 0
          }
          stabilizer.frames = st.stableFrames
          const chordFingers = live.fingers[st.chordHand]
          const rec = live.recorder
          if (rec) {
            if (chordFingers) rec.add(chordFingers.ext, frameTime)
            if (rec.phase(frameTime) === 'done') {
              const res = rec.finish()
              live.recorder = null
              if (res.ok) {
                st.setTemplate(res.id, res.template)
                st.setCalibrating(
                  null,
                  res.spread > 0.2
                    ? `${res.id} 저장됨. 다만 녹화 중 손모양이 많이 흔들렸습니다. 다시 녹화하는 걸 권장합니다.`
                    : `${res.id} 템플릿을 저장했습니다. (샘플 ${res.samples}개)`,
                )
              } else {
                st.setCalibrating(null, `손이 거의 보이지 않아 저장하지 못했습니다. ${st.chordHand === 'Left' ? '왼손' : '오른손'}이 화면에 보이는지 확인하세요.`)
              }
            }
          }
          live.match =
            chordFingers && !live.recorder ? matchChord(chordFingers.ext, st.templates, st.threshold) : null
          const id = live.match?.id ?? null
          if (id !== candidateId) {
            candidateId = id
            candidateSince = frameTime
          }
          const { confirmed, changed } = stabilizer.push(id)
          if (changed) {
            st.setConfirmedChord(confirmed)
            // 코드 모드에서만 확정 즉시 재생한다. 스트럼 모드에서는 코드만 고르고 소리는 스트로크가 낸다.
            const toPlay = st.mode === 'chord' ? trigger.next(confirmed) : null
            if (toPlay) {
              playChord(toPlay)
              live.latencyMs = performance.now() - candidateSince + outputLatencyMs()
            }
          }
          if (st.mode === 'strum' && !live.recorder) {
            const strumSide = st.chordHand === 'Left' ? 'Right' : 'Left'
            const hand = frame.hands.find((h) => h.handedness === strumSide)
            if (hand) {
              strum.triggerSpeed = st.strumThreshold
              const wrist = hand.landmarks[0]
              const ev = strum.push(wrist.y, handScale(hand.landmarks, aspect), frameTime)
              live.strumSpeed = strum.speed
              if (ev && confirmed) {
                playChord(confirmed, { direction: ev.direction, velocity: ev.strength })
                live.lastStrum = { direction: ev.direction, at: performance.now() }
                live.latencyMs = performance.now() - frameTime + outputLatencyMs()
              }
            } else {
              strum.reset()
              live.strumSpeed = 0
            }
          }
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
      live.fingers = {}
      live.match = null
      live.recorder = null
      live.strumSpeed = 0
      stopAudio()
      useAppStore.getState().setConfirmedChord(null)
      useAppStore.getState().setCalibrating(null)
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
