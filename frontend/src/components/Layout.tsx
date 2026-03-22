import { Link } from 'react-router-dom'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-gray-900 text-white px-6 py-4">
        <Link to="/" className="text-xl font-bold tracking-tight">
          comp<span className="text-blue-400">IQ</span>
        </Link>
      </nav>
      <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
