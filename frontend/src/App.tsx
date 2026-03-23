import { Routes, Route, Navigate } from 'react-router-dom'
import { Show } from '@clerk/react'
import Layout from './components/Layout'
import LandingPage from './pages/LandingPage'
import HomePage from './pages/HomePage'
import ReportPage from './pages/ReportPage'
import BatchPage from './pages/BatchPage'
import PDFReportPage from './pages/PDFReportPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Show when="signed-out">
        <Navigate to="/" replace />
      </Show>
      <Show when="signed-in">
        {children}
      </Show>
    </>
  )
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />

      {/* PDF export (no nav) */}
      <Route path="/app/report/:id/pdf" element={<ProtectedRoute><PDFReportPage /></ProtectedRoute>} />

      {/* App routes (with nav) */}
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/app" element={<HomePage />} />
        <Route path="/app/report/:id" element={<ReportPage />} />
        <Route path="/app/batch" element={<BatchPage />} />
      </Route>
    </Routes>
  )
}
