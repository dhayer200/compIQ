import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getAnalysis, getExportUrl } from '../api/client'
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
              className="inline-flex items-center gap-1.5 bg-gray-900 text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-gray-800 transition-colors"
            >
              PDF
            </Link>
            <a
              href={getExportUrl(id!, 'docx')}
              className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
            >
              DOCX
            </a>
            <a
              href={getExportUrl(id!, 'md')}
              className="inline-flex items-center gap-1.5 bg-gray-600 text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-gray-700 transition-colors"
            >
              MD
            </a>
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

      {/* Cash Flow Potential + Acquisition */}
      {(data.cash_flow_potential || data.acquisition) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.cash_flow_potential && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Current Cash Flow Potential</p>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-bold text-gray-900">
                  ${data.cash_flow_potential.comp_price_low.toLocaleString()} &ndash; ${data.cash_flow_potential.comp_price_high.toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                Median comp: ${data.cash_flow_potential.median_price.toLocaleString()} &middot; Spread: ${(data.cash_flow_potential.comp_price_high - data.cash_flow_potential.comp_price_low).toLocaleString()}
              </p>
            </div>
          )}
          {data.acquisition && (data.acquisition.last_sale_date || data.acquisition.last_sale_price) && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Acquisition Data</p>
              {data.acquisition.last_sale_price && (
                <p className="text-2xl font-bold text-gray-900 mb-2">
                  ${data.acquisition.last_sale_price.toLocaleString()}
                </p>
              )}
              {data.acquisition.last_sale_date && (
                <p className="text-sm text-gray-500">
                  Last sold: {new Date(data.acquisition.last_sale_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              )}
              {data.acquisition.last_sale_price && data.estimate.estimated_value > 0 && (
                <p className="text-sm text-green-600 font-medium mt-1">
                  {((data.estimate.estimated_value - data.acquisition.last_sale_price) / data.acquisition.last_sale_price * 100) > 0 ? '+' : ''}
                  {((data.estimate.estimated_value - data.acquisition.last_sale_price) / data.acquisition.last_sale_price * 100).toFixed(1)}% since acquisition
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <MarketStats daysOnMarket={data.days_on_market} compsCount={data.comps.length} />
      <CompsTable comps={data.comps} />
      <NarrativeReport text={data.narrative} />

      <div className="flex items-center justify-center gap-4 print:hidden pt-2">
        <Link to="/app" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
          Run another analysis
        </Link>
      </div>
    </div>
  )
}
