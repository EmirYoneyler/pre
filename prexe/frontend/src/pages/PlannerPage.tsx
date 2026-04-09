import { useState } from 'react'
import { api } from '../lib/api'

const GOALS = ['lose', 'gain', 'maintain']
const ACTIVITY_LEVELS = ['sedentary', 'light', 'active', 'very_active']
const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: 'Sedentary (desk job)',
  light: 'Light (1–3x/week)',
  active: 'Active (3–5x/week)',
  very_active: 'Very active (6–7x/week)',
}

export default function PlannerPage() {
  const [form, setForm] = useState({
    weight_kg: '',
    height_cm: '',
    goal: 'maintain',
    activity_level: 'light',
  })
  const [plan, setPlan] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await api.generatePlan({
        weight_kg: Number(form.weight_kg),
        height_cm: Number(form.height_cm),
        goal: form.goal,
        activity_level: form.activity_level,
      })
      setPlan(result)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const macros = plan
    ? [
        { label: 'Calories', value: plan.calories, unit: 'kcal', color: 'text-green-400' },
        { label: 'Protein',  value: plan.protein_g, unit: 'g',   color: 'text-blue-400' },
        { label: 'Carbs',    value: plan.carbs_g,   unit: 'g',   color: 'text-yellow-400' },
        { label: 'Fat',      value: plan.fat_g,     unit: 'g',   color: 'text-orange-400' },
      ]
    : []

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">AI Planner</h1>

      <form onSubmit={handleGenerate} className="bg-gray-900 rounded-xl p-6 space-y-5 mb-8">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Weight (kg)</label>
            <input
              type="number" value={form.weight_kg} onChange={set('weight_kg')}
              required min={30} max={300} step={0.1}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-green-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Height (cm)</label>
            <input
              type="number" value={form.height_cm} onChange={set('height_cm')}
              required min={100} max={250} step={0.1}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-green-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">Goal</label>
          <div className="flex gap-2">
            {GOALS.map(g => (
              <button
                key={g} type="button"
                onClick={() => setForm(f => ({ ...f, goal: g }))}
                className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                  form.goal === g
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {g} weight
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Activity level</label>
          <select
            value={form.activity_level} onChange={set('activity_level')}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-green-500"
          >
            {ACTIVITY_LEVELS.map(l => (
              <option key={l} value={l}>{ACTIVITY_LABELS[l]}</option>
            ))}
          </select>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit" disabled={loading}
          className="w-full py-3 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
        >
          {loading ? 'Generating your plan…' : 'Generate plan'}
        </button>
      </form>

      {plan && (
        <div className="space-y-6">
          {/* Macro grid */}
          <div className="grid grid-cols-4 gap-3">
            {macros.map(({ label, value, unit, color }) => (
              <div key={label} className="bg-gray-900 rounded-xl p-4 text-center">
                <div className={`text-2xl font-bold ${color}`}>{value}</div>
                <div className="text-gray-500 text-xs mt-0.5">{unit}</div>
                <div className="text-gray-400 text-xs mt-1">{label}</div>
              </div>
            ))}
          </div>

          {/* Macro bar */}
          <div className="bg-gray-900 rounded-xl p-5">
            <p className="text-sm text-gray-400 mb-3">Macro split</p>
            <div className="flex rounded-full overflow-hidden h-4">
              {(() => {
                const total = plan.protein_g * 4 + plan.carbs_g * 4 + plan.fat_g * 9
                return [
                  { pct: (plan.protein_g * 4 / total) * 100, color: 'bg-blue-500' },
                  { pct: (plan.carbs_g * 4 / total) * 100, color: 'bg-yellow-500' },
                  { pct: (plan.fat_g * 9 / total) * 100, color: 'bg-orange-500' },
                ].map(({ pct, color }, i) => (
                  <div key={i} className={`${color} transition-all`} style={{ width: `${pct}%` }} />
                ))
              })()}
            </div>
            <div className="flex gap-4 mt-2 text-xs text-gray-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block"/>Protein</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block"/>Carbs</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500 inline-block"/>Fat</span>
            </div>
          </div>

          {/* Workout plan */}
          <div className="bg-gray-900 rounded-xl p-5">
            <p className="text-sm text-gray-400 uppercase tracking-wide mb-3">Weekly workout plan</p>
            <p className="text-gray-100 text-sm leading-relaxed">{plan.workout_plan}</p>
          </div>

          {/* Lifestyle tips */}
          <div className="bg-gray-900 rounded-xl p-5">
            <p className="text-sm text-gray-400 uppercase tracking-wide mb-3">Lifestyle tips</p>
            <p className="text-gray-100 text-sm leading-relaxed">{plan.lifestyle_tips}</p>
          </div>
        </div>
      )}
    </div>
  )
}
