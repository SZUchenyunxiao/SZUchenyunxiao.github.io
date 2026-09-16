import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { ProjectPage } from './pages/ProjectPage'
import { initAnalytics, trackPageView } from '../analytics/tracker/tracker'

export default function App() {
  const location = useLocation()
  const analyticsEndpoint =
    import.meta.env.VITE_ANALYTICS_ENDPOINT ||
    (import.meta.env.PROD
      ? 'https://portfolio-analytics.szuchenyunxiao.workers.dev/api/collect'
      : '')

  useEffect(() => {
    if (analyticsEndpoint) initAnalytics({ endpoint: analyticsEndpoint })
  }, [analyticsEndpoint])

  useEffect(() => {
    if (!analyticsEndpoint) return
    const match = location.pathname.match(/^\/projects\/([^/]+)$/)
    trackPageView(location.pathname, match?.[1])
  }, [analyticsEndpoint, location.pathname])

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/projects/:slug" element={<ProjectPage />} />
    </Routes>
  )
}
