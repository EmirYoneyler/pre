import { Outlet, NavLink } from 'react-router-dom'

const nav = [
  { to: '/workout', label: 'Workout', icon: '💪' },
  { to: '/chat',    label: 'Coach',   icon: '🤖' },
  { to: '/planner', label: 'Planner', icon: '📋' },
  { to: '/history', label: 'History', icon: '📈' },
  { to: '/profile', label: 'Profile', icon: '👤' },
]

export default function Layout() {
  return (
    <div className="flex h-screen bg-gray-950">
      {/* Sidebar */}
      <aside className="w-56 flex flex-col bg-gray-900 border-r border-gray-800">
        <div className="p-5 border-b border-gray-800">
          <span className="text-green-400 font-bold text-xl tracking-tight">COACH<span className="text-white">AI</span></span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map(({ to, label, icon }) => (
            <NavLink
              key={to} to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-green-500/10 text-green-400 font-medium'
                    : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800'
                }`
              }
            >
              <span className="text-base">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
