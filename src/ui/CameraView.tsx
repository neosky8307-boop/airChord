import { useEffect, useRef } from 'react'
import { openCamera } from '../hand/camera'
import { createHandTracker, ModelLoadError, type HandTracker } from '../hand/tracker'
import { HAND_CONNECTIONS } from '../hand/connections'
import type { HandFrame } from '../hand/types'
import { ChordTrigger } from '../audio/trigger'
import { outputLatencyMs, playChord, playNote, stopAudio } from '../audio/engine'
import { matchChord, Stabilizer } from '../chords/matching'
import { handScale, StrumDetector } from '../chords/strum'
import { DEFAULT_RECT, keyAtPoint, layoutKeys, toDisplayX } from '../piano/keyboard'
import { AirPianoDetector } from '../piano/press'
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

/** 가상 건반. 컨테이너가 CSS로 좌우 반전되므로, 반전 표시일 때는 캔버스를 미리 한 번 뒤집어 글자가 바로 읽히게 한다. */
function drawKeyboard(ctx: CanvasRenderingContext2D, w: number, h: number, mirror: boolean) {
  ctx.save()
  if (mirror) {
    ctx.translate(w, 0)
    ctx.scale(-1, 1)
  }
  const now = performance.now()
  const top = DEFAULT_RECT.top * h
  const height = (DEFAULT_RECT.bottom - DEFAULT_RECT.top) * h
  ctx.font = 'bold 16px system-ui, sans-serif'
  ctx.textAlign = 'center'
  for (const key of layoutKeys()) {
    const x = key.x0 * w
    const kw = (key.x1 - key.x0) * w
    const pressed = now - (live.pressed[key.note] ?? -1e9) < 250
    ctx.fillStyle = pressed ? 'rgba(59,130,246,0.75)' : 'rgba(255,255,255,0.28)'
    ctx.fillRect(x + 1, top, kw - 2, height)
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'
    ctx.lineWidth = 2
    ctx.strokeRect(x + 1, top, kw - 2, height)
    ctx.fillStyle = '#fff'
    ctx.fillText(key.note, x + kw / 2, top + height - 12)
  }
  ctx.restore()
}

function draw(ctx: CanvasRenderingContext2D, frame: HandFrame, w: number, h: number, mirror: boolean, piano: boolean) {
  ctx.clearRect(0, 0, w, h)
  if (piano) drawKeyboard(ctx, w, h, mirror)
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
  const cameraId = useAppStore((s) => s.cameraId)

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
        const opened = await openCamera(cameraId)
        stream = opened.stream
        // 저장된 카메라가 사라졌으면 기본 카메라로 열렸다. 설정도 기본으로 되돌린다.
        if (opened.fellBack) useAppStore.getState().setSetting('cameraId', null)
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
      const piano = new AirPianoDetector()
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
          draw(ctx, frame, canvas.width, canvas.height, useAppStore.getState().mirror, useAppStore.getState().mode === 'piano')
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
            piano.reset()
            live.strumSpeed = 0
            live.pianoStats = { speed: 0, bend: 0 }
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
            chordFingers && !live.recorder && st.mode !== 'piano' ? matchChord(chordFingers.ext, st.templates, st.threshold) : null
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
          if (st.mode === 'piano' && !live.recorder) {
            piano.pressSpeed = st.pianoPressSpeed
            piano.bendSpeed = st.pianoBendSpeed
            const seen = new Set<string>()
            const tracked = frame.hands.map((h) => {
              const id = seen.has(h.handedness) ? `${h.handedness}2` : h.handedness
              seen.add(h.handedness)
              return { id, landmarks: h.landmarks, ext: fingerExtensions(h.landmarks, { aspect }) }
            })
            for (const ev of piano.update(tracked, aspect, frameTime)) {
              const key = keyAtPoint(toDisplayX(ev.x, st.mirror), ev.y)
              if (!key) continue // 건반 영역 밖에서 누른 건 무시
              playNote(key.note, { velocity: ev.strength })
              const at = performance.now()
              live.pressed[key.note] = at
              live.lastNote = { note: key.note, at }
              live.latencyMs = at - frameTime + outputLatencyMs()
            }
            live.pianoStats = piano.stats
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
      live.pressed = {}
      live.pianoStats = { speed: 0, bend: 0 }
      stopAudio()
      useAppStore.getState().setConfirmedChord(null)
      useAppStore.getState().setCalibrating(null)
      useAppStore.getState().setStatus('idle')
    }
  }, [running, cameraId])

  return (
    <div className="camera" style={{ transform: mirror ? 'scaleX(-1)' : undefined }}>
      <video ref={videoRef} playsInline muted />
      <canvas ref={canvasRef} />
    </div>
  )
}
