import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/ui/Layout'
import WorkoutPage from './pages/WorkoutPage'
import ChatPage from './pages/ChatPage'
import PlannerPage from './pages/PlannerPage'
import HistoryPage from './pages/HistoryPage'
import ProfilePage from './pages/ProfilePage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index          element={<Navigate to="/workout" replace />} />
        <Route path="workout" element={<WorkoutPage />} />
        <Route path="chat"    element={<ChatPage />} />
        <Route path="planner" element={<PlannerPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
    </Routes>
  )
}
