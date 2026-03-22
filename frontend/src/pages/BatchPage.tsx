import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { runBatchAnalysis, type BatchResultItem } from '../api/client'

function fmt(n: number) {
  return '$' + n.toLocaleString()
}

export default function BatchPage() {
  const [text, setText] = useState('')
  const [results, setResults] = useState<BatchResultItem[]>([])
  const mutation = useMutation({
    mutationFn: async (addresses: string[]) => {
      const res = await runBatchAnalysis(addresses)
      setResults(res.results)
      return res
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const addresses = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    if (addresses.length === 0) return
    if (addresses.length > 25) {
      alert('Maximum 25 addresses per batch')
      return
    }
    setResults([])
    mutation.mutate(addresses)
  }

  const addressCount = text.split('\n').map((l) => l.trim()).filter(Boolean).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Batch Analysis</h1>
        <p className="text-gray-500 text-sm mt-1">
          Run comps analysis on multiple properties at once. Enter one address per line.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Property Addresses
            {addressCount > 0 && (
              <span className="text-gray-400 font-normal ml-2">
                ({addressCount} {addressCount === 1 ? 'address' : 'addresses'})
              </span>
            )}
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            placeholder={"123 Main St, Austin, TX 78701\n456 Oak Ave, Dallas, TX 75201\n789 Elm Dr, Houston, TX 77001"}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono resize-y"
          />
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">Max 25 addresses per batch</p>
          <button
            type="submit"
            disabled={mutation.isPending || addressCount === 0}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {mutation.isPending ? 'Analyzing...' : `Analyze ${addressCount > 0 ? addressCount : ''} Properties`}
          </button>
        </div>
      </form>

      {/* Progress */}
      {mutation.isPending && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700">Processing addresses...</p>
            <p className="text-sm text-gray-500">This may take a few minutes</p>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full animate-pulse" style={{ width: '100%' }} />
          </div>
        </div>
      )}

      {/* Error */}
      {mutation.isError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-700 text-sm">Batch analysis failed. Please try again.</p>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Results</h2>
              <div className="flex gap-3 text-sm">
                <span className="text-green-600 font-medium">
                  {results.filter((r) => r.status === 'success').length} succeeded
                </span>
                {results.some((r) => r.status === 'error') && (
                  <span className="text-red-500 font-medium">
                    {results.filter((r) => r.status === 'error').length} failed
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-left">
                <tr>
                  <th className="px-6 py-3 font-medium">Address</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Est. Value</th>
                  <th className="px-4 py-3 font-medium">Est. Rent</th>
                  <th className="px-4 py-3 font-medium">Comps</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {results.map((r, i) => (
                  <tr key={i} className={r.status === 'error' ? 'bg-red-50/50' : 'hover:bg-gray-50'}>
                    <td className="px-6 py-3 font-medium text-gray-900 max-w-xs truncate">{r.address}</td>
                    <td className="px-4 py-3">
                      {r.status === 'success' ? (
                        <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 px-2 py-0.5 rounded-full text-xs font-medium">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          Done
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 px-2 py-0.5 rounded-full text-xs font-medium">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          Error
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {r.analysis ? fmt(r.analysis.estimate.estimated_value) : '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {r.analysis ? `${fmt(r.analysis.rent.rent)}/mo` : '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {r.analysis ? r.analysis.comps.length : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {r.analysis && (
                        <Link
                          to={`/report/${r.analysis.id}`}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                        >
                          View Report
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
