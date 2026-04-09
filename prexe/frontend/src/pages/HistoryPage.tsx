import { useState, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar
} from 'recharts'
import { api } from '../lib/api'

export default function HistoryPage() {
  const [workouts, setWorkouts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    api.listWorkouts()
      .then(data => setWorkouts(data.reverse()))  // oldest first for charts
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const exercises = ['all', ...Array.from(new Set(workouts.map(w => w.exercise_name)))]
  const filtered = filter === 'all' ? workouts : workouts.filter(w => w.exercise_name === filter)

  const chartData = filtered.map((w, i) => ({
    index: i + 1,
    date: new Date(w.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    reps: w.reps,
    score: w.form_score ?? 0,
    exercise: w.exercise_name,
  }))

  const stats = {
    totalSets: filtered.length,
    totalReps: filtered.reduce((s, w) => s + w.reps, 0),
    avgScore: filtered.filter(w => w.form_score).length
      ? (filtered.filter(w => w.form_score).reduce((s, w) => s + w.form_score, 0) /
         filtered.filter(w => w.form_score).length).toFixed(1)
      : '—',
    bestScore: filtered.filter(w => w.form_score).length
      ? Math.max(...filtered.filter(w => w.form_score).map(w => w.form_score)).toFixed(1)
      : '—',
  }

  if (loading) return (
    <div className="p-6 text-center text-gray-400 mt-20">Loading history…</div>
  )

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">History</h1>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {exercises.map(ex => (
          <button
            key={ex}
            onClick={() => setFilter(ex)}
            className={`px-3 py-1.5 rounded-lg text-sm capitalize transition-colors ${
              filter === ex
                ? 'bg-green-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {ex}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Total sets', value: stats.totalSets },
          { label: 'Total reps', value: stats.totalReps },
          { label: 'Avg form score', value: stats.avgScore },
          { label: 'Best score', value: stats.bestScore },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-900 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-400">{value}</div>
            <div className="text-gray-400 text-xs mt-1">{label}</div>
          </div>
        ))}
      </div>

      {workouts.length === 0 ? (
        <div className="text-center text-gray-500 mt-16">
          <p className="text-lg mb-2">No workouts yet</p>
          <p className="text-sm">Complete a set in the Workout page to see your history here.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Form score over time */}
          {chartData.some(d => d.score > 0) && (
            <div className="bg-gray-900 rounded-xl p-5">
              <p className="text-sm text-gray-400 uppercase tracking-wide mb-4">Form score over time</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <YAxis domain={[0, 10]} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
                    labelStyle={{ color: '#d1d5db' }}
                  />
                  <Line
                    type="monotone" dataKey="score" stroke="#22c55e"
                    strokeWidth={2} dot={{ fill: '#22c55e', r: 3 }} name="Form score"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Reps per set */}
          <div className="bg-gray-900 rounded-xl p-5">
            <p className="text-sm text-gray-400 uppercase tracking-wide mb-4">Reps per set</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
                  labelStyle={{ color: '#d1d5db' }}
                />
                <Bar dataKey="reps" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Reps" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Recent sets table */}
          <div className="bg-gray-900 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800">
              <p className="text-sm text-gray-400 uppercase tracking-wide">Recent sets</p>
            </div>
            <div className="divide-y divide-gray-800">
              {[...filtered].reverse().slice(0, 20).map((w) => (
                <div key={w.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{w.exercise_name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(w.created_at).toLocaleDateString('en', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <div className="font-medium text-blue-400">{w.reps}</div>
                      <div className="text-xs text-gray-500">reps</div>
                    </div>
                    {w.form_score != null && (
                      <div className="text-center">
                        <div className={`font-medium ${
                          w.form_score >= 8 ? 'text-green-400' :
                          w.form_score >= 6 ? 'text-yellow-400' : 'text-red-400'
                        }`}>{w.form_score}</div>
                        <div className="text-xs text-gray-500">score</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
