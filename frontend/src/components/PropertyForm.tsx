import { useState, useEffect, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { runAnalysis } from '../api/client'
import { useAnalysisStore } from '../stores/analysisStore'

const STATE_ABBREVS: Record<string, string> = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
  'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
  'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
  'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
  'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
  'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
  'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
  'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
  'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
  'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
  'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
  'Wisconsin': 'WI', 'Wyoming': 'WY', 'District of Columbia': 'DC',
}

interface NominatimResult {
  display_name: string
  address: {
    house_number?: string
    road?: string
    city?: string
    town?: string
    village?: string
    state?: string
    postcode?: string
  }
}

function formatAddress(s: NominatimResult): string {
  const a = s.address
  const street = [a.house_number, a.road].filter(Boolean).join(' ')
  const city = a.city || a.town || a.village || ''
  const state = a.state ? (STATE_ABBREVS[a.state] || a.state) : ''
  return [street, city, [state, a.postcode].filter(Boolean).join(' ')].filter(Boolean).join(', ')
}

export default function PropertyForm() {
  const [address, setAddress] = useState('')
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([])
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
      navigate(`/app/report/${data.id}`)
    },
  })

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (address.length < 3) {
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
        const data: NominatimResult[] = await resp.json()
        // Only show results that have a street address
        setSuggestions(data.filter((s) => s.address?.road && s.address?.house_number))
        setShowSuggestions(true)
        setHighlightIdx(-1)
      } catch {
        setSuggestions([])
      }
    }, 300)
  }, [address])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selectSuggestion = (s: NominatimResult) => {
    setAddress(formatAddress(s))
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

  const normalizeAddress = (raw: string): string => {
    let addr = raw.trim()
    // Collapse multiple spaces
    addr = addr.replace(/\s+/g, ' ')
    // Common abbreviations people forget
    const abbrevs: [RegExp, string][] = [
      [/\bstreet\b/i, 'St'],
      [/\bavenue\b/i, 'Ave'],
      [/\bboulevard\b/i, 'Blvd'],
      [/\bdrive\b/i, 'Dr'],
      [/\blane\b/i, 'Ln'],
      [/\broad\b/i, 'Rd'],
      [/\bcourt\b/i, 'Ct'],
      [/\bplace\b/i, 'Pl'],
      [/\bcircle\b/i, 'Cir'],
    ]
    for (const [pat, rep] of abbrevs) {
      addr = addr.replace(pat, rep)
    }
    // Replace full state names with abbreviations
    for (const [full, abbr] of Object.entries(STATE_ABBREVS)) {
      const re = new RegExp(`\\b${full}\\b`, 'i')
      if (re.test(addr)) {
        addr = addr.replace(re, abbr)
        break
      }
    }
    return addr
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!address.trim()) return
    setShowSuggestions(false)
    mutation.mutate({ address: normalizeAddress(address) })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6">
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        Property Address
      </label>
      <div className="flex gap-3">
        <div className="relative flex-1" ref={wrapperRef}>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            placeholder="123 Main St, Austin, TX 78701"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
          />
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
              {suggestions.map((s, i) => {
                const formatted = formatAddress(s)
                return (
                  <li
                    key={i}
                    className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                      i === highlightIdx ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'
                    }`}
                    onMouseDown={() => selectSuggestion(s)}
                  >
                    {formatted}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap transition-colors"
        >
          {mutation.isPending ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Analyzing...
            </span>
          ) : 'Run Analysis'}
        </button>
      </div>
      {mutation.isError && (
        <p className="text-red-500 text-sm mt-3">
          {(mutation.error as any)?.response?.data?.detail || 'Analysis failed. Check the address and try again.'}
        </p>
      )}
    </form>
  )
}
