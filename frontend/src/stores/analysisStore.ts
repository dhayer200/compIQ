import { create } from 'zustand'
import type { AnalysisResponse } from '../api/client'

interface AnalysisState {
  current: AnalysisResponse | null
  loading: boolean
  error: string | null
  setCurrent: (analysis: AnalysisResponse) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clear: () => void
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
  current: null,
  loading: false,
  error: null,
  setCurrent: (analysis) => set({ current: analysis, loading: false, error: null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
  clear: () => set({ current: null, loading: false, error: null }),
}))
