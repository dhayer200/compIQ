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
      <div className="bg-white rounded-lg shadow p-6">
        <Skeleton className="h-6 w-2/3 mb-2" />
        <Skeleton className="h-4 w-1/3 mb-3" />
        <div className="flex gap-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-8 w-40 mb-4" />
        <Skeleton className="h-3 w-full" />
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-8 w-40 mb-4" />
        <Skeleton className="h-3 w-full" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow p-6"><Skeleton className="h-10 w-20 mx-auto" /></div>
        <div className="bg-white rounded-lg shadow p-6"><Skeleton className="h-10 w-20 mx-auto" /></div>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <Skeleton className="h-4 w-40 mb-4" />
        <Skeleton className="h-3 w-full mb-2" />
        <Skeleton className="h-3 w-full mb-2" />
        <Skeleton className="h-3 w-3/4" />
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
        <Link to="/" className="text-blue-600 hover:underline text-sm">Back to home</Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="bg-white rounded-lg shadow p-6 print:shadow-none print:border">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{data.subject.address}</h1>
            <p className="text-gray-500 mt-1">
              {[data.subject.city, data.subject.state, data.subject.zip_code].filter(Boolean).join(', ')}
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="text-sm text-gray-500 hover:text-gray-700 print:hidden"
          >
            Print Report
          </button>
        </div>
        <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
          {data.subject.bedrooms && <span>{data.subject.bedrooms} bed</span>}
          {data.subject.bathrooms && <span>{data.subject.bathrooms} bath</span>}
          {data.subject.sqft && <span>{data.subject.sqft.toLocaleString()} sqft</span>}
          {data.subject.year_built && <span>Built {data.subject.year_built}</span>}
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

      <div className="text-center print:hidden">
        <Link to="/" className="text-sm text-blue-600 hover:underline">Run another analysis</Link>
      </div>
    </div>
  )
}
