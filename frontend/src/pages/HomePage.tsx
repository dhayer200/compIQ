import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useUser } from '@clerk/react'
import PropertyForm from '../components/PropertyForm'
import { getRecentAnalyses } from '../api/client'
import { getUserTier } from '../lib/tier'

const FREE_MONTHLY_LIMIT = 5

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
  const { user } = useUser()
  const tier = getUserTier(user)
  const { data: recent } = useQuery({
    queryKey: ['recent-analyses'],
    queryFn: getRecentAnalyses,
  })

  // Count analyses created this month
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  const monthlyCount = (recent || []).filter(
    (a) => new Date(a.created_at).getTime() >= monthStart
  ).length
  const atLimit = tier !== 'pro' && monthlyCount >= FREE_MONTHLY_LIMIT

  return (
    <div className="space-y-10">
      {/* Hero */}
      <div className="text-center pt-4 pb-2">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
          Comps analysis in seconds
        </h1>
        <p className="text-gray-500 mt-3 max-w-lg mx-auto">
          Enter a property address to get comparable sales, value estimates, rent projections, and a full CMA report.
        </p>
      </div>

      {atLimit ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-sm font-semibold text-gray-900">Monthly limit reached</p>
          <p className="text-sm text-gray-500 mt-1">
            Free accounts get {FREE_MONTHLY_LIMIT} analyses per month. You've used {monthlyCount}.
          </p>
          <p className="text-xs text-gray-400 mt-3">Upgrade to Pro for unlimited analyses.</p>
        </div>
      ) : (
        <>
          {tier !== 'pro' && (
            <p className="text-center text-xs text-gray-400 -mb-8">
              {monthlyCount}/{FREE_MONTHLY_LIMIT} free analyses used this month
            </p>
          )}
          <PropertyForm />
        </>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          to="/app/batch"
          className="group bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all"
        >
          <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center mb-3 group-hover:bg-blue-100 transition-colors">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900 text-sm">Batch Analysis</h3>
          <p className="text-xs text-gray-500 mt-1">Analyze up to 25 properties at once</p>
        </Link>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900 text-sm">PDF Reports</h3>
          <p className="text-xs text-gray-500 mt-1">Professional branded reports for clients</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900 text-sm">API Caching</h3>
          <p className="text-xs text-gray-500 mt-1">7-day cache to save API calls</p>
        </div>
      </div>

      {/* Recent analyses */}
      {recent && recent.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Recent Analyses</h2>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
            {recent.map((a) => (
              <Link
                key={a.id}
                to={`/app/report/${a.id}`}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{a.address}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{timeAgo(a.created_at)}</p>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">{fmt(a.estimated_value)}</span>
                  <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
