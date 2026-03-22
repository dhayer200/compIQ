interface Props {
  label: string
  low: number
  mid: number
  high: number
}

function fmt(n: number) {
  return '$' + n.toLocaleString()
}

export default function PriceRange({ label, low, mid, high }: Props) {
  const range = high - low
  const midPct = range > 0 ? ((mid - low) / range) * 100 : 50

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 print:border-0 print:shadow-none">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</h2>
      <p className="text-3xl font-bold text-gray-900 mb-4">{fmt(mid)}</p>
      <div className="relative h-2.5 bg-gray-100 rounded-full">
        <div
          className="absolute h-2.5 bg-gradient-to-r from-blue-200 via-blue-400 to-blue-200 rounded-full"
          style={{ left: '0%', width: '100%' }}
        />
        <div
          className="absolute top-1/2 w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-md"
          style={{ left: `${midPct}%`, transform: 'translate(-50%, -50%)' }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-400 mt-2">
        <span>{fmt(low)}</span>
        <span>{fmt(high)}</span>
      </div>
    </div>
  )
}
