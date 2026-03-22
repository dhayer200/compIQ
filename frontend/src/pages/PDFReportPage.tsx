import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getAnalysis } from '../api/client'

function fmt(n: number) {
  return '$' + n.toLocaleString()
}

export default function PDFReportPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, error } = useQuery({
    queryKey: ['analysis', id],
    queryFn: () => getAnalysis(id!),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">Failed to load report.</p>
        <Link to="/" className="text-blue-600 hover:underline text-sm">Back to home</Link>
      </div>
    )
  }

  const paragraphs = data.narrative.split('\n\n').filter(Boolean)
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const capRate = data.rent.rent && data.estimate.estimated_value
    ? ((data.rent.rent * 12) / data.estimate.estimated_value * 100).toFixed(1)
    : null

  return (
    <>
      {/* Print button - hidden in print */}
      <div className="fixed top-4 right-4 z-50 print:hidden flex gap-2">
        <Link
          to={`/report/${id}`}
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          Back to Report
        </Link>
        <button
          onClick={() => window.print()}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          Download PDF
        </button>
      </div>

      {/* PDF Layout - designed for print */}
      <div className="pdf-report max-w-[8.5in] mx-auto bg-white">

        {/* Cover Header */}
        <div className="px-12 pt-10 pb-8 border-b-4 border-blue-600">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">cIQ</span>
                </div>
                <span className="text-lg font-bold text-gray-900 tracking-tight">
                  comp<span className="text-blue-600">IQ</span>
                </span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Comparative Market Analysis</h1>
              <p className="text-gray-500 text-sm">Prepared {today}</p>
            </div>
            <div className="text-right text-sm text-gray-500">
              <p className="font-medium text-gray-700">Report ID</p>
              <p className="font-mono text-xs">{data.id.toString().slice(0, 8)}</p>
            </div>
          </div>
        </div>

        {/* Subject Property */}
        <div className="px-12 py-8 border-b border-gray-200">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">Subject Property</p>
          <h2 className="text-xl font-bold text-gray-900 mb-1">{data.subject.address}</h2>
          <p className="text-gray-500 text-sm">
            {[data.subject.city, data.subject.state, data.subject.zip_code].filter(Boolean).join(', ')}
          </p>
          <div className="grid grid-cols-4 gap-4 mt-5">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Bedrooms</p>
              <p className="text-lg font-bold text-gray-900">
                {data.subject.bedrooms === 0 ? 'Studio' : (data.subject.bedrooms ?? '-')}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Bathrooms</p>
              <p className="text-lg font-bold text-gray-900">{data.subject.bathrooms ?? '-'}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Living Area</p>
              <p className="text-lg font-bold text-gray-900">
                {data.subject.sqft ? `${data.subject.sqft.toLocaleString()} sf` : '-'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Year Built</p>
              <p className="text-lg font-bold text-gray-900">{data.subject.year_built ?? '-'}</p>
            </div>
          </div>
        </div>

        {/* Value Estimate */}
        <div className="px-12 py-8 border-b border-gray-200">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-4">Valuation Summary</p>
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2">
              <p className="text-sm text-gray-500 mb-1">Estimated Market Value</p>
              <p className="text-4xl font-bold text-gray-900">{fmt(data.estimate.estimated_value)}</p>
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Low: {fmt(data.estimate.range_low)}</span>
                  <span>High: {fmt(data.estimate.range_high)}</span>
                </div>
                <div className="relative h-3 bg-gray-100 rounded-full">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-200 via-blue-400 to-blue-200 rounded-full" />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-md"
                    style={{
                      left: `${((data.estimate.estimated_value - data.estimate.range_low) / (data.estimate.range_high - data.estimate.range_low)) * 100}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Est. Monthly Rent</p>
                <p className="text-xl font-bold text-gray-900">{fmt(data.rent.rent)}</p>
                <p className="text-xs text-gray-400">{fmt(data.rent.range_low)} - {fmt(data.rent.range_high)}</p>
              </div>
              {capRate && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Gross Cap Rate</p>
                  <p className="text-xl font-bold text-gray-900">{capRate}%</p>
                </div>
              )}
              {data.days_on_market != null && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Avg. Days on Market</p>
                  <p className="text-xl font-bold text-gray-900">{data.days_on_market}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Comparable Sales */}
        <div className="px-12 py-8 border-b border-gray-200">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-4">
            Comparable Sales ({data.comps.length})
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200 text-left">
                <th className="pb-2 font-semibold text-gray-700 text-xs uppercase tracking-wider">Address</th>
                <th className="pb-2 font-semibold text-gray-700 text-xs uppercase tracking-wider text-right">Sale Price</th>
                <th className="pb-2 font-semibold text-gray-700 text-xs uppercase tracking-wider text-center">Bed/Bath</th>
                <th className="pb-2 font-semibold text-gray-700 text-xs uppercase tracking-wider text-right">Sqft</th>
                <th className="pb-2 font-semibold text-gray-700 text-xs uppercase tracking-wider text-right">Dist.</th>
                <th className="pb-2 font-semibold text-gray-700 text-xs uppercase tracking-wider text-right">Adj. Price</th>
              </tr>
            </thead>
            <tbody>
              {data.comps.map((c, i) => (
                <tr key={c.id || i} className="border-b border-gray-100">
                  <td className="py-2 text-gray-900 text-xs max-w-[200px] truncate">{c.address}</td>
                  <td className="py-2 text-gray-700 text-right text-xs">{fmt(c.sale_price)}</td>
                  <td className="py-2 text-gray-700 text-center text-xs">
                    {c.bedrooms === 0 ? 'S' : (c.bedrooms ?? '-')}/{c.bathrooms ?? '-'}
                  </td>
                  <td className="py-2 text-gray-700 text-right text-xs">{c.sqft?.toLocaleString() ?? '-'}</td>
                  <td className="py-2 text-gray-700 text-right text-xs">{c.distance_miles?.toFixed(1) ?? '-'} mi</td>
                  <td className="py-2 font-medium text-gray-900 text-right text-xs">{fmt(c.adjusted_price ?? c.sale_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Adjustments Summary */}
        {data.comps.some(c => c.adjustments) && (
          <div className="px-12 py-8 border-b border-gray-200">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-4">
              Adjustment Summary
            </p>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b-2 border-gray-200 text-left">
                  <th className="pb-2 font-semibold text-gray-700 uppercase tracking-wider">Comp Address</th>
                  <th className="pb-2 font-semibold text-gray-700 uppercase tracking-wider text-right">Sqft</th>
                  <th className="pb-2 font-semibold text-gray-700 uppercase tracking-wider text-right">Beds</th>
                  <th className="pb-2 font-semibold text-gray-700 uppercase tracking-wider text-right">Baths</th>
                  <th className="pb-2 font-semibold text-gray-700 uppercase tracking-wider text-right">Age</th>
                  <th className="pb-2 font-semibold text-gray-700 uppercase tracking-wider text-right">Location</th>
                  <th className="pb-2 font-semibold text-gray-700 uppercase tracking-wider text-right">Time</th>
                  <th className="pb-2 font-semibold text-gray-700 uppercase tracking-wider text-right">Net</th>
                </tr>
              </thead>
              <tbody>
                {data.comps.filter(c => c.adjustments).map((c, i) => {
                  const adj = c.adjustments!
                  const net = Object.values(adj).reduce((a, b) => a + b, 0)
                  const fmtAdj = (v: number) => {
                    if (v === 0) return '-'
                    const sign = v > 0 ? '+' : ''
                    return `${sign}$${Math.abs(v).toLocaleString()}`
                  }
                  return (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-1.5 text-gray-900 max-w-[180px] truncate">{c.address}</td>
                      <td className={`py-1.5 text-right ${(adj.sqft ?? 0) >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmtAdj(adj.sqft ?? 0)}</td>
                      <td className={`py-1.5 text-right ${(adj.bedrooms ?? 0) >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmtAdj(adj.bedrooms ?? 0)}</td>
                      <td className={`py-1.5 text-right ${(adj.bathrooms ?? 0) >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmtAdj(adj.bathrooms ?? 0)}</td>
                      <td className={`py-1.5 text-right ${(adj.age ?? 0) >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmtAdj(adj.age ?? 0)}</td>
                      <td className={`py-1.5 text-right ${(adj.location ?? 0) >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmtAdj(adj.location ?? 0)}</td>
                      <td className={`py-1.5 text-right ${(adj.time ?? 0) >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmtAdj(adj.time ?? 0)}</td>
                      <td className={`py-1.5 text-right font-medium ${net >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmtAdj(net)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Narrative */}
        <div className="px-12 py-8 border-b border-gray-200">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-4">Analysis Narrative</p>
          <div className="text-sm text-gray-700 leading-relaxed space-y-3">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-12 py-6 bg-gray-50">
          <div className="flex justify-between items-center text-xs text-gray-400">
            <div>
              <span className="font-semibold text-gray-500">comp<span className="text-blue-600">IQ</span></span>
              {' '} Comparative Market Analysis
            </div>
            <div>
              Generated {today} | This report is for informational purposes only and does not constitute an appraisal.
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
