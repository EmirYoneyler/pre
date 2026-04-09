import { useState } from 'react'
import { api } from '../lib/api'

export default function ProfilePage() {
  const [form, setForm] = useState({
    display_name:   '',
    weight_kg:      '',
    height_cm:      '',
    goal:           'maintain',
    activity_level: 'light',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.updateMe({
        display_name:   form.display_name   || null,
        weight_kg:      form.weight_kg      ? Number(form.weight_kg)  : null,
        height_cm:      form.height_cm      ? Number(form.height_cm)  : null,
        goal:           form.goal           || null,
        activity_level: form.activity_level || null,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const bmi = form.weight_kg && form.height_cm
    ? (Number(form.weight_kg) / Math.pow(Number(form.height_cm) / 100, 2)).toFixed(1)
    : null

  const bmiLabel = bmi
    ? Number(bmi) < 18.5 ? 'Underweight'
    : Number(bmi) < 25   ? 'Normal'
    : Number(bmi) < 30   ? 'Overweight'
    : 'Obese'
    : null

  const bmiColor = bmi
    ? Number(bmi) < 18.5 ? 'text-blue-400'
    : Number(bmi) < 25   ? 'text-green-400'
    : Number(bmi) < 30   ? 'text-yellow-400'
    : 'text-red-400'
    : ''

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Profile</h1>
      <p className="text-gray-400 text-sm mb-8">Your profile</p>

      {bmi && (
        <div className="bg-gray-900 rounded-xl p-5 mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Your BMI</p>
            <p className={`text-3xl font-bold mt-1 ${bmiColor}`}>{bmi}</p>
          </div>
          <div className={`text-sm font-medium px-3 py-1.5 rounded-full bg-gray-800 ${bmiColor}`}>
            {bmiLabel}
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Display name</label>
          <input
            value={form.display_name} onChange={set('display_name')}
            placeholder="Your name"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Weight (kg)</label>
            <input
              type="number" value={form.weight_kg} onChange={set('weight_kg')}
              min={30} max={300} step={0.1}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-green-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Height (cm)</label>
            <input
              type="number" value={form.height_cm} onChange={set('height_cm')}
              min={100} max={250} step={0.1}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-green-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">Goal</label>
          <div className="flex gap-2">
            {['lose', 'maintain', 'gain'].map(g => (
              <button
                key={g} type="button"
                onClick={() => setForm(f => ({ ...f, goal: g }))}
                className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                  form.goal === g
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Activity level</label>
          <select
            value={form.activity_level} onChange={set('activity_level')}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-green-500"
          >
            <option value="sedentary">Sedentary (desk job)</option>
            <option value="light">Light (1–3x/week)</option>
            <option value="active">Active (3–5x/week)</option>
            <option value="very_active">Very active (6–7x/week)</option>
          </select>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit" disabled={saving}
          className="w-full py-3 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
        >
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save profile'}
        </button>
      </form>
    </div>
  )
}
