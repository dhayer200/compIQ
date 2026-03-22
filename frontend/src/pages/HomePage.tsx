import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import PropertyForm from '../components/PropertyForm'
import { getRecentAnalyses } from '../api/client'

function fmt(n: number) {
  return '$' + n.toLocaleString()
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default function HomePage() {
  const { data: recent } = useQuery({
    queryKey: ['recent-analyses'],
    queryFn: getRecentAnalyses,
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Property Analysis</h1>
        <p className="text-gray-500 text-sm mb-6">
          Enter a property address to get comparable sales analysis, value estimate, and rent projection.
        </p>
        <PropertyForm />
      </div>

      {recent && recent.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Recent Analyses</h2>
          <div className="bg-white rounded-lg shadow divide-y divide-gray-100">
            {recent.map((a) => (
              <Link
                key={a.id}
                to={`/report/${a.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{a.address}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{timeAgo(a.created_at)}</p>
                </div>
                <span className="text-sm font-semibold text-gray-700">{fmt(a.estimated_value)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
