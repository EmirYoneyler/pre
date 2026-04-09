const BASE = (import.meta.env.VITE_API_URL ?? '') + '/api'

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(err.detail || 'Request failed')
  }

  if (res.status === 204) return null as T
  return res.json()
}

export const api = {
  // User
  getMe: () => request<any>('/users/me'),
  updateMe: (data: any) =>
    request<any>('/users/me', { method: 'PATCH', body: JSON.stringify(data) }),

  // Workouts
  saveWorkout: (data: any) =>
    request<any>('/workouts', { method: 'POST', body: JSON.stringify(data) }),
  listWorkouts: () => request<any[]>('/workouts'),
  analyzeForm: (data: any) =>
    request<any>('/workouts/analyze', { method: 'POST', body: JSON.stringify(data) }),

  // Exercises
  listExercises: () => request<any[]>('/workouts/exercises'),
  generateExercise: (name: string) =>
    request<any>(`/workouts/exercises/generate?name=${encodeURIComponent(name)}`, {
      method: 'POST',
    }),

  // Chat
  sendMessage: (content: string) =>
    request<any>('/chat', { method: 'POST', body: JSON.stringify({ content }) }),
  getChatHistory: () => request<any[]>('/chat/history'),
  clearChatHistory: () => request('/chat/history', { method: 'DELETE' }),

  // Plan
  generatePlan: (data: any) =>
    request<any>('/plan', { method: 'POST', body: JSON.stringify(data) }),
}
