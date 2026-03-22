import { useState } from 'react'
import type { CompProperty } from '../api/client'
import AdjustmentsBreakdown from './AdjustmentsBreakdown'

function fmt(n: number | null) {
  return n != null ? '$' + n.toLocaleString() : '-'
}

export default function CompsTable({ comps }: { comps: CompProperty[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden print:border-0 print:shadow-none">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 pt-5 pb-3">
        Comparable Sales
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-6 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Address</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sale Price</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sqft</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Bed/Bath</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Distance</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Adj. Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {comps.map((c) => (
              <tr key={c.id}>
                <td colSpan={6} className="p-0">
                  <div
                    className="grid grid-cols-6 px-6 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                  >
                    <span className="truncate text-gray-900">{c.address}</span>
                    <span className="px-4 text-gray-700">{fmt(c.sale_price)}</span>
                    <span className="px-4 text-gray-700">{c.sqft?.toLocaleString() ?? '-'}</span>
                    <span className="px-4 text-gray-700">{c.bedrooms === 0 ? 'Studio' : (c.bedrooms ?? '-')}/{c.bathrooms ?? '-'}</span>
                    <span className="px-4 text-gray-700">{c.distance_miles?.toFixed(1) ?? '-'} mi</span>
                    <span className="px-4 font-medium text-gray-900">{fmt(c.adjusted_price)}</span>
                  </div>
                  {expanded === c.id && c.adjustments && (
                    <AdjustmentsBreakdown adjustments={c.adjustments} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
