import { useState, useEffect } from 'react'
import { usePoseTracker } from '../hooks/usePoseTracker'
import { api } from '../lib/api'

const BUILTIN_EXERCISES: Record<string, any> = {
  Squat: {
    landmarks: ['LEFT_HIP', 'LEFT_KNEE', 'LEFT_ANKLE'],
    thresholds: { down: 90, up: 160 },
    mode: 'max_min',
  },
  'Bicep Curl': {
    landmarks: ['LEFT_SHOULDER', 'LEFT_ELBOW', 'LEFT_WRIST'],
    thresholds: { down: 40, up: 160 },
    mode: 'max_min',
  },
  Pushup: {
    landmarks: ['LEFT_SHOULDER', 'LEFT_ELBOW', 'LEFT_WRIST'],
    thresholds: { down: 80, up: 160 },
    mode: 'max_min',
  },
}

export default function WorkoutPage() {
  const [exercises, setExercises] = useState<Record<string, any>>(BUILTIN_EXERCISES)
  const [selectedName, setSelectedName] = useState('Squat')
  const [customName, setCustomName] = useState('')
  const [generating, setGenerating] = useState(false)
  const [analysis, setAnalysis] = useState<any>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [cameraOn, setCameraOn] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  const config = exercises[selectedName] ?? null

  const {
    videoRef, canvasRef,
    reps, angle, stage,
    isReady, isRecording,
    startCamera, stopCamera,
    startRecording, stopRecording,
    resetReps,
  } = usePoseTracker(config)

  useEffect(() => {
    api.listExercises().then(list => {
      const custom: Record<string, any> = {}
      list.forEach((ex: any) => { custom[ex.name] = ex })
      setExercises(prev => ({ ...prev, ...custom }))
    }).catch(() => {})
  }, [])

  async function handleToggleCamera() {
    if (cameraOn) {
      stopCamera()
      setCameraOn(false)
    } else {
      await startCamera()
      setCameraOn(true)
    }
  }

  async function handleStopSet() {
    const frameData = stopRecording()
    if (frameData.length === 0) return

    setAnalyzing(true)
    setAnalysis(null)
    try {
      const result = await api.analyzeForm({ exercise_name: selectedName, angle_data: frameData })
      setAnalysis(result)

      await api.saveWorkout({
        exercise_name: selectedName,
        reps,
        form_score: result.form_score,
        ai_feedback: result.observations.join(' '),
        angle_data: frameData.slice(0, 50),
      })
      setSaveMsg('Set saved!')
      setTimeout(() => setSaveMsg(''), 3000)
    } catch (e) {
      console.error(e)
    } finally {
      setAnalyzing(false)
    }
    resetReps()
  }

  async function handleGenerateExercise() {
    if (!customName.trim()) return
    setGenerating(true)
    try {
      const ex = await api.generateExercise(customName.trim())
      setExercises(prev => ({ ...prev, [ex.name]: ex }))
      setSelectedName(ex.name)
      setCustomName('')
    } catch (e: any) {
      alert(e.message)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Workout</h1>

      {/* Exercise selector */}
      <div className="flex flex-wrap gap-3 mb-6">
        {Object.keys(exercises).map(name => (
          <button
            key={name}
            onClick={() => { setSelectedName(name); resetReps() }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedName === name
                ? 'bg-green-500 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Custom exercise creator */}
      <div className="flex gap-2 mb-6">
        <input
          value={customName}
          onChange={e => setCustomName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleGenerateExercise()}
          placeholder="Add custom exercise (e.g. Lateral Raise)…"
          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 text-sm"
        />
        <button
          onClick={handleGenerateExercise} disabled={generating || !customName.trim()}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
        >
          {generating ? 'Generating…' : 'Generate'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Camera view */}
        <div className="space-y-3">
          <div className="relative bg-gray-900 rounded-xl overflow-hidden aspect-video">
            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted playsInline />
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
            {!cameraOn && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                <p>Camera off</p>
              </div>
            )}
            {!isReady && cameraOn && (
              <div className="absolute top-2 right-2 bg-yellow-500/20 text-yellow-400 text-xs px-2 py-1 rounded">
                Loading model…
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleToggleCamera}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                cameraOn
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {cameraOn ? 'Stop camera' : 'Start camera'}
            </button>

            {cameraOn && !isRecording && (
              <button
                onClick={startRecording}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Start set
              </button>
            )}
            {isRecording && (
              <button
                onClick={handleStopSet}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors animate-pulse"
              >
                Stop set
              </button>
            )}
          </div>
          {saveMsg && <p className="text-green-400 text-sm text-center">{saveMsg}</p>}
        </div>

        {/* Stats + analysis */}
        <div className="space-y-4">
          {/* Live stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Reps', value: reps },
              { label: 'Angle', value: `${angle}°` },
              { label: 'Stage', value: stage.toUpperCase() },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-900 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-green-400">{value}</div>
                <div className="text-gray-400 text-xs mt-1">{label}</div>
              </div>
            ))}
          </div>

          {/* AI analysis */}
          {analyzing && (
            <div className="bg-gray-900 rounded-xl p-4 text-center text-gray-400 text-sm">
              Analyzing your form…
            </div>
          )}

          {analysis && (
            <div className="bg-gray-900 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Form score</span>
                <span className={`text-2xl font-bold ${
                  analysis.form_score >= 8 ? 'text-green-400' :
                  analysis.form_score >= 6 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {analysis.form_score}/10
                </span>
              </div>

              {analysis.observations.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Observations</p>
                  <ul className="space-y-1">
                    {analysis.observations.map((o: string, i: number) => (
                      <li key={i} className="text-sm text-gray-300 flex gap-2">
                        <span className="text-green-400 mt-0.5">•</span>{o}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.corrections.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Corrections</p>
                  <ul className="space-y-1">
                    {analysis.corrections.map((c: string, i: number) => (
                      <li key={i} className="text-sm text-yellow-300 flex gap-2">
                        <span className="mt-0.5">⚠</span>{c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.progression_tips.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Next steps</p>
                  <ul className="space-y-1">
                    {analysis.progression_tips.map((t: string, i: number) => (
                      <li key={i} className="text-sm text-blue-300 flex gap-2">
                        <span className="mt-0.5">→</span>{t}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
