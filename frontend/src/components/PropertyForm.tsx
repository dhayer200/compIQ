import { useState, useEffect, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { runAnalysis } from '../api/client'
import { useAnalysisStore } from '../stores/analysisStore'

interface Suggestion {
  display_name: string
  address: {
    house_number?: string
    road?: string
    city?: string
    town?: string
    state?: string
    postcode?: string
  }
}

function formatSuggestion(s: Suggestion): string {
  const a = s.address
  const street = [a.house_number, a.road].filter(Boolean).join(' ')
  const city = a.city || a.town || ''
  return [street, city, a.state, a.postcode].filter(Boolean).join(', ')
}

export default function PropertyForm() {
  const [address, setAddress] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState(-1)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const setCurrent = useAnalysisStore((s) => s.setCurrent)

  const mutation = useMutation({
    mutationFn: runAnalysis,
    onSuccess: (data) => {
      setCurrent(data)
      navigate(`/report/${data.id}`)
    },
  })

  // Fetch suggestions from Nominatim (free, no API key)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (address.length < 5) {
      setSuggestions([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q: address,
          format: 'json',
          addressdetails: '1',
          limit: '5',
          countrycodes: 'us',
        })
        const resp = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
          headers: { 'Accept-Language': 'en' },
        })
        const data: Suggestion[] = await resp.json()
        setSuggestions(data.filter((s) => s.address?.road))
        setShowSuggestions(true)
        setHighlightIdx(-1)
      } catch {
        setSuggestions([])
      }
    }, 350)
  }, [address])

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selectSuggestion = (s: Suggestion) => {
    setAddress(formatSuggestion(s))
    setShowSuggestions(false)
    setSuggestions([])
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIdx((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && highlightIdx >= 0) {
      e.preventDefault()
      selectSuggestion(suggestions[highlightIdx])
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!address.trim()) return
    setShowSuggestions(false)
    mutation.mutate({ address: address.trim() })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">Property Address</label>
      <div className="flex gap-3">
        <div className="relative flex-1" ref={wrapperRef}>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            placeholder="123 Main St, Austin, TX 78701"
            className="w-full border border-gray-300 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
              {suggestions.map((s, i) => (
                <li
                  key={i}
                  className={`px-4 py-2 text-sm cursor-pointer ${
                    i === highlightIdx ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'
                  }`}
                  onMouseDown={() => selectSuggestion(s)}
                >
                  {formatSuggestion(s)}
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="bg-blue-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
        >
          {mutation.isPending ? 'Analyzing...' : 'Run Analysis'}
        </button>
      </div>
      {mutation.isError && (
        <p className="text-red-500 text-sm mt-2">Analysis failed. Please try again.</p>
      )}
    </form>
  )
}
