import { useState } from 'react'
import type { CompProperty } from '../api/client'
import AdjustmentsBreakdown from './AdjustmentsBreakdown'

function fmt(n: number | null) {
  return n != null ? '$' + n.toLocaleString() : '-'
}

export default function CompsTable({ comps }: { comps: CompProperty[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden print:shadow-none print:border">
      <h2 className="text-sm font-medium text-gray-500 px-6 pt-6 pb-3">Comparable Sales</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-gray-50 text-gray-600 text-left">
            <tr>
              <th className="px-6 py-3">Address</th>
              <th className="px-4 py-3">Sale Price</th>
              <th className="px-4 py-3">Sqft</th>
              <th className="px-4 py-3">Bed/Bath</th>
              <th className="px-4 py-3">Distance</th>
              <th className="px-4 py-3">Adj. Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {comps.map((c) => (
              <tr key={c.id}>
                <td colSpan={6} className="p-0">
                  <div
                    className="grid grid-cols-6 px-6 py-3 cursor-pointer hover:bg-gray-50"
                    onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                  >
                    <span className="truncate">{c.address}</span>
                    <span className="px-4">{fmt(c.sale_price)}</span>
                    <span className="px-4">{c.sqft?.toLocaleString() ?? '-'}</span>
                    <span className="px-4">{c.bedrooms ?? '-'}/{c.bathrooms ?? '-'}</span>
                    <span className="px-4">{c.distance_miles?.toFixed(1) ?? '-'} mi</span>
                    <span className="px-4 font-medium">{fmt(c.adjusted_price)}</span>
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
