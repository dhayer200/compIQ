import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getAnalysis } from '../api/client'
import PriceRange from '../components/PriceRange'
import CompsTable from '../components/CompsTable'
import NarrativeReport from '../components/NarrativeReport'
import MarketStats from '../components/MarketStats'

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <Skeleton className="h-6 w-2/3 mb-2" />
        <Skeleton className="h-4 w-1/3 mb-3" />
        <div className="flex gap-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-8 w-40 mb-4" />
        <Skeleton className="h-3 w-full" />
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-8 w-40 mb-4" />
        <Skeleton className="h-3 w-full" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6"><Skeleton className="h-10 w-20 mx-auto" /></div>
        <div className="bg-white rounded-xl border border-gray-200 p-6"><Skeleton className="h-10 w-20 mx-auto" /></div>
      </div>
    </div>
  )
}

export default function ReportPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, error } = useQuery({
    queryKey: ['analysis', id],
    queryFn: () => getAnalysis(id!),
    enabled: !!id,
  })

  if (isLoading) return <LoadingSkeleton />
  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">Failed to load analysis.</p>
        <Link to="/app" className="text-blue-600 hover:underline text-sm">Back to home</Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Subject Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 print:border-0 print:shadow-none">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{data.subject.address}</h1>
            <p className="text-gray-500 mt-1 text-sm">
              {[data.subject.city, data.subject.state, data.subject.zip_code].filter(Boolean).join(', ')}
            </p>
          </div>
          <div className="flex gap-2 print:hidden">
            <Link
              to={`/app/report/${id}/pdf`}
              className="inline-flex items-center gap-1.5 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              Export PDF
            </Link>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 mt-3">
          {data.subject.bedrooms != null && (
            <span className="inline-flex items-center bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md text-xs font-medium">
              {data.subject.bedrooms === 0 ? 'Studio' : `${data.subject.bedrooms} bed`}
            </span>
          )}
          {data.subject.bathrooms != null && (
            <span className="inline-flex items-center bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md text-xs font-medium">
              {data.subject.bathrooms} bath
            </span>
          )}
          {data.subject.sqft != null && data.subject.sqft > 0 && (
            <span className="inline-flex items-center bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md text-xs font-medium">
              {data.subject.sqft.toLocaleString()} sqft
            </span>
          )}
          {data.subject.year_built && (
            <span className="inline-flex items-center bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md text-xs font-medium">
              Built {data.subject.year_built}
            </span>
          )}
        </div>
      </div>

      <PriceRange
        label="Estimated Value"
        low={data.estimate.range_low}
        mid={data.estimate.estimated_value}
        high={data.estimate.range_high}
      />

      <PriceRange
        label="Estimated Monthly Rent"
        low={data.rent.range_low}
        mid={data.rent.rent}
        high={data.rent.range_high}
      />

      <MarketStats daysOnMarket={data.days_on_market} compsCount={data.comps.length} />
      <CompsTable comps={data.comps} />
      <NarrativeReport text={data.narrative} />

      <div className="flex items-center justify-center gap-4 print:hidden pt-2">
        <Link to="/app" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
          Run another analysis
        </Link>
        <span className="text-gray-300">|</span>
        <Link
          to={`/app/report/${id}/pdf`}
          className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
        >
          Export as PDF
        </Link>
      </div>
    </div>
  )
}
