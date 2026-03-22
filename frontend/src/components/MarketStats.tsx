interface Props {
  daysOnMarket: number | null
  compsCount: number
}

export default function MarketStats({ daysOnMarket, compsCount }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-sm text-gray-500">Est. Days on Market</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">
          {daysOnMarket != null ? daysOnMarket : '-'}
        </p>
      </div>
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-sm text-gray-500">Comparables Used</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{compsCount}</p>
      </div>
    </div>
  )
}
