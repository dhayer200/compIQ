interface Props {
  daysOnMarket: number | null
  compsCount: number
}

export default function MarketStats({ daysOnMarket, compsCount }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-white rounded-xl border border-gray-200 p-5 text-center print:border-0 print:shadow-none">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Avg. Days on Market</p>
        <p className="text-3xl font-bold text-gray-900 mt-2">
          {daysOnMarket != null ? daysOnMarket : '-'}
        </p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-5 text-center print:border-0 print:shadow-none">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Comparables Used</p>
        <p className="text-3xl font-bold text-gray-900 mt-2">{compsCount}</p>
      </div>
    </div>
  )
}
