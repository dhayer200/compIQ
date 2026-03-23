import { Link, NavLink, Outlet } from 'react-router-dom'
import { UserButton } from '@clerk/react'

export default function Layout() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors ${
      isActive
        ? 'text-white'
        : 'text-gray-400 hover:text-gray-200'
    }`

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <Link to="/app" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-xs">cIQ</span>
            </div>
            <span className="text-lg font-bold text-white tracking-tight">
              comp<span className="text-blue-400">IQ</span>
            </span>
          </Link>
          <div className="flex items-center gap-6">
            <NavLink to="/app" end className={linkClass}>
              Analyze
            </NavLink>
            <NavLink to="/app/batch" className={linkClass}>
              Batch
            </NavLink>
            <UserButton />
          </div>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
