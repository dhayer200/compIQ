import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 120_000, // 2 min — Render free tier cold starts can be slow
})

export interface PropertyInput {
  address: string
  bedrooms?: number
  bathrooms?: number
  sqft?: number
  lot_size?: number
  year_built?: number
  market?: string
}

export interface MarketInfo {
  key: string
  name: string
  price_per_sqft: number
  price_per_bedroom: number
  price_per_bathroom: number
}

export async function getMarkets(): Promise<MarketInfo[]> {
  const { data } = await api.get<MarketInfo[]>('/markets')
  return data
}

export interface CompProperty {
  id: string
  address: string
  sale_price: number
  sale_date: string | null
  bedrooms: number | null
  bathrooms: number | null
  sqft: number | null
  lot_size: number | null
  year_built: number | null
  distance_miles: number | null
  correlation: number | null
  adjusted_price: number | null
  adjustments: Record<string, number> | null
}

export interface CashFlowPotential {
  comp_price_low: number
  comp_price_high: number
  median_price: number
}

export interface AcquisitionData {
  last_sale_date: string | null
  last_sale_price: number | null
}

export interface AnalysisResponse {
  id: string
  subject: {
    address: string
    city: string | null
    state: string | null
    zip_code: string | null
    bedrooms: number | null
    bathrooms: number | null
    sqft: number | null
    lot_size: number | null
    year_built: number | null
  }
  estimate: {
    estimated_value: number
    range_low: number
    range_high: number
  }
  rent: {
    rent: number
    range_low: number
    range_high: number
  }
  days_on_market: number | null
  comps: CompProperty[]
  narrative: string
  cash_flow_potential: CashFlowPotential | null
  acquisition: AcquisitionData | null
  created_at: string | null
}

export async function runAnalysis(input: PropertyInput): Promise<AnalysisResponse> {
  const { data } = await api.post<AnalysisResponse>('/analysis', input)
  return data
}

export async function getAnalysis(id: string): Promise<AnalysisResponse> {
  const { data } = await api.get<AnalysisResponse>(`/analysis/${id}`)
  return data
}

export interface AnalysisSummary {
  id: string
  address: string
  estimated_value: number
  created_at: string
}

export async function getRecentAnalyses(): Promise<AnalysisSummary[]> {
  const { data } = await api.get<AnalysisSummary[]>('/analyses')
  return data
}

// Batch analysis
export interface BatchResultItem {
  address: string
  status: 'success' | 'error'
  analysis: AnalysisResponse | null
  error: string | null
}

export interface BatchResponse {
  total: number
  succeeded: number
  failed: number
  results: BatchResultItem[]
}

export async function runBatchAnalysis(addresses: string[]): Promise<BatchResponse> {
  const { data } = await api.post<BatchResponse>('/analysis/batch', { addresses })
  return data
}

// Manual comp import
export interface ManualComp {
  address: string
  sale_price: number
  sale_date?: string
  bedrooms?: number
  bathrooms?: number
  sqft?: number
  lot_size?: number
  year_built?: number
  property_type?: string
  status?: string  // "active", "under_contract", "expired", "sold"
}

export interface CustomAnalysisInput {
  address: string
  market?: string
  bedrooms?: number
  bathrooms?: number
  sqft?: number
  lot_size?: number
  year_built?: number
  manual_comps: ManualComp[]
}

export async function runCustomAnalysis(input: CustomAnalysisInput): Promise<AnalysisResponse> {
  const { data } = await api.post<AnalysisResponse>('/analysis/custom', input)
  return data
}

// Export
export function getExportUrl(analysisId: string, format: 'md' | 'docx'): string {
  const base = import.meta.env.VITE_API_URL || '/api'
  return `${base}/analysis/${analysisId}/export/${format}`
}
