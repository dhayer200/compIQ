import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import ReportPage from './pages/ReportPage'
import BatchPage from './pages/BatchPage'
import PDFReportPage from './pages/PDFReportPage'

export default function App() {
  return (
    <Routes>
      <Route path="/report/:id/pdf" element={<PDFReportPage />} />
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/report/:id" element={<ReportPage />} />
        <Route path="/batch" element={<BatchPage />} />
      </Route>
    </Routes>
  )
}
