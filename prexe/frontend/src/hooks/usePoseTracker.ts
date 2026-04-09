import { useEffect, useRef, useState, useCallback } from 'react'
import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision'

interface ExerciseConfig {
  landmarks: string[]   // e.g. ['LEFT_HIP', 'LEFT_KNEE', 'LEFT_ANKLE']
  thresholds: { down: number; up: number }
  mode: 'max_min' | 'min_max'
}

const LANDMARK_INDEX: Record<string, number> = {
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,    RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,    RIGHT_WRIST: 16,
  LEFT_HIP: 23,      RIGHT_HIP: 24,
  LEFT_KNEE: 25,     RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,    RIGHT_ANKLE: 28,
}

function calcAngle(a: {x:number,y:number}, b: {x:number,y:number}, c: {x:number,y:number}): number {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x)
  let angle = Math.abs((radians * 180) / Math.PI)
  if (angle > 180) angle = 360 - angle
  return angle
}

export function usePoseTracker(config: ExerciseConfig | null) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const landmarkerRef = useRef<PoseLandmarker | null>(null)
  const rafRef = useRef<number>(0)
  const stageRef = useRef<'up' | 'down'>('up')
  const recordingRef = useRef(false)
  const frameDataRef = useRef<any[]>([])

  const angleHistoryRef = useRef<number[]>([])

  const [reps, setReps] = useState(0)
  const [angle, setAngle] = useState(0)
  const [stage, setStage] = useState<'up' | 'down'>('up')
  const [isReady, setIsReady] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const frameCount = useRef(0)

  // Load MediaPipe
  useEffect(() => {
    async function init() {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      )
      landmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
      })
      setIsReady(true)
    }
    init()
    return () => { landmarkerRef.current?.close() }
  }, [])

  // Start webcam
  const startCamera = useCallback(async () => {
    if (!videoRef.current) return
    const stream = await navigator.mediaDevices.getUserMedia({ video: true })
    videoRef.current.srcObject = stream
    videoRef.current.play()
  }, [])

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    const stream = videoRef.current?.srcObject as MediaStream
    stream?.getTracks().forEach(t => t.stop())
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  // Main detection loop
  useEffect(() => {
    if (!isReady || !config) return

    const cfg = config
    let lastTime = -1
    let repCount = 0

    function detect() {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas || !landmarkerRef.current) {
        rafRef.current = requestAnimationFrame(detect)
        return
      }

      const now = performance.now()
      if (now === lastTime) {
        rafRef.current = requestAnimationFrame(detect)
        return
      }
      lastTime = now

      if (video.readyState < 2 || video.videoWidth === 0) {
        rafRef.current = requestAnimationFrame(detect)
        return
      }

      let result
      try {
        result = landmarkerRef.current.detectForVideo(video, now)
      } catch {
        rafRef.current = requestAnimationFrame(detect)
        return
      }

      const ctx = canvas.getContext('2d')!
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (result.landmarks.length > 0) {
        const lm = result.landmarks[0]
        const drawing = new DrawingUtils(ctx)
        drawing.drawConnectors(lm, PoseLandmarker.POSE_CONNECTIONS, { color: '#22c55e', lineWidth: 2 })
        drawing.drawLandmarks(lm, { color: '#fff', lineWidth: 1, radius: 3 })

        // Angle calculation
        const [nameA, nameB, nameC] = cfg.landmarks
        const idxA = LANDMARK_INDEX[nameA], idxB = LANDMARK_INDEX[nameB], idxC = LANDMARK_INDEX[nameC]
        if (idxA !== undefined && idxB !== undefined && idxC !== undefined) {
          const a = lm[idxA], b = lm[idxB], c = lm[idxC]

          // Skip frame if any landmark is not reliably visible (out of frame or occluded)
          if ((a.visibility ?? 1) < 0.5 || (b.visibility ?? 1) < 0.5 || (c.visibility ?? 1) < 0.5) {
            rafRef.current = requestAnimationFrame(detect)
            return
          }

          const rawAng = calcAngle(a, b, c)

          // Smooth over last 5 frames to reduce jitter
          angleHistoryRef.current.push(rawAng)
          if (angleHistoryRef.current.length > 5) angleHistoryRef.current.shift()
          const ang = angleHistoryRef.current.reduce((s, v) => s + v, 0) / angleHistoryRef.current.length

          setAngle(Math.round(ang))

          // Rep counting state machine
          const { down: downThresh, up: upThresh } = cfg.thresholds
          const isDown = cfg.mode === 'max_min' ? ang <= downThresh : ang >= downThresh
          const isUp   = cfg.mode === 'max_min' ? ang >= upThresh   : ang <= upThresh

          if (isDown && stageRef.current === 'up') {
            stageRef.current = 'down'
            setStage('down')
          } else if (isUp && stageRef.current === 'down') {
            stageRef.current = 'up'
            setStage('up')
            repCount++
            setReps(repCount)
          }

          // Record every 10th frame
          if (recordingRef.current) {
            frameCount.current++
            if (frameCount.current % 10 === 0) {
              frameDataRef.current.push({
                i: frameCount.current,
                a: Math.round(ang),
                s: stageRef.current.toUpperCase(),
                l: lm.slice(0, 29).map(p => ({ x: p.x, y: p.y })),
              })
            }
          }

          // HUD overlay
          ctx.fillStyle = 'rgba(0,0,0,0.55)'
          ctx.roundRect(12, 12, 160, 80, 10)
          ctx.fill()
          ctx.fillStyle = '#22c55e'
          ctx.font = 'bold 28px system-ui'
          ctx.fillText(`${repCount} reps`, 24, 48)
          ctx.fillStyle = '#fff'
          ctx.font = '14px system-ui'
          ctx.fillText(`Angle: ${Math.round(ang)}°`, 24, 70)
          ctx.fillText(`Stage: ${stageRef.current.toUpperCase()}`, 24, 88)
        }
      }
      rafRef.current = requestAnimationFrame(detect)
    }

    rafRef.current = requestAnimationFrame(detect)
    return () => cancelAnimationFrame(rafRef.current)
  }, [isReady, config])

  const startRecording = useCallback(() => {
    frameDataRef.current = []
    frameCount.current = 0
    recordingRef.current = true
    setIsRecording(true)
  }, [])

  const stopRecording = useCallback(() => {
    recordingRef.current = false
    setIsRecording(false)
    return frameDataRef.current
  }, [])

  const resetReps = useCallback(() => {
    setReps(0)
    stageRef.current = 'up'
    setStage('up')
    angleHistoryRef.current = []
  }, [])

  return {
    videoRef, canvasRef,
    reps, angle, stage,
    isReady, isRecording,
    startCamera, stopCamera,
    startRecording, stopRecording,
    resetReps,
  }
}
