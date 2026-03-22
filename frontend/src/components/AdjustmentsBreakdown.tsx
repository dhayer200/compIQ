const labels: Record<string, string> = {
  sqft: 'Square Footage',
  bedrooms: 'Bedrooms',
  bathrooms: 'Bathrooms',
  lot_size: 'Lot Size',
  age: 'Property Age',
  location: 'Location',
  time: 'Market Timing',
}

function fmt(n: number) {
  const sign = n >= 0 ? '+' : ''
  return sign + '$' + Math.abs(n).toLocaleString()
}

export default function AdjustmentsBreakdown({ adjustments }: { adjustments: Record<string, number> }) {
  const total = Object.values(adjustments).reduce((a, b) => a + b, 0)

  return (
    <div className="bg-gray-50 px-10 py-3 border-t border-gray-100">
      <p className="text-xs font-medium text-gray-500 mb-2">Adjustment Breakdown</p>
      <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
        {Object.entries(adjustments).map(([key, val]) => (
          <div key={key} className="flex justify-between">
            <span className="text-gray-600">{labels[key] ?? key}</span>
            <span className={val >= 0 ? 'text-green-600' : 'text-red-600'}>{fmt(val)}</span>
          </div>
        ))}
        <div className="flex justify-between col-span-2 border-t border-gray-200 pt-1 mt-1 font-medium">
          <span className="text-gray-700">Net Adjustment</span>
          <span className={total >= 0 ? 'text-green-700' : 'text-red-700'}>{fmt(total)}</span>
        </div>
      </div>
    </div>
  )
}
