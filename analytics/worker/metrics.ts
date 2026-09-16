import type { Env, OverviewMetrics, RangeQuery } from './types'

interface OverviewRow {
  page_views: number
  unique_visitors: number
  sessions: number
  avg_foreground_ms: number
  resume_clicks: number
  contact_clicks: number
}

interface TrendRow {
  day: string
  page_views: number
  visitors: number
}

export async function computeOverview(env: Env, query: RangeQuery): Promise<OverviewMetrics> {
  const row = await env.DB.prepare(
    `WITH filtered AS (
       SELECT e.*
       FROM events e
       JOIN sessions s ON s.session_id = e.session_id
       WHERE e.created_at BETWEEN ? AND ? AND s.is_excluded = 0
     ), per_session AS (
       SELECT session_id, SUM(CASE WHEN type = 'duration' THEN foreground_ms ELSE 0 END) AS foreground_ms
       FROM filtered
       GROUP BY session_id
     )
     SELECT
       COALESCE(SUM(CASE WHEN type = 'page_view' THEN 1 ELSE 0 END), 0) AS page_views,
       COUNT(DISTINCT visitor_id) AS unique_visitors,
       COUNT(DISTINCT session_id) AS sessions,
       COALESCE((SELECT AVG(foreground_ms) FROM per_session), 0) AS avg_foreground_ms,
       COALESCE(SUM(CASE WHEN type = 'action' AND action_name = 'resume_download' THEN 1 ELSE 0 END), 0) AS resume_clicks,
       COALESCE(SUM(CASE WHEN type = 'action' AND action_name = 'contact_email' THEN 1 ELSE 0 END), 0) AS contact_clicks
     FROM filtered`,
  )
    .bind(query.from, query.to)
    .first<OverviewRow>()

  const trend = await env.DB.prepare(
    `SELECT
       date(e.created_at / 1000, 'unixepoch', '+8 hours') AS day,
       SUM(CASE WHEN e.type = 'page_view' THEN 1 ELSE 0 END) AS page_views,
       COUNT(DISTINCT e.visitor_id) AS visitors
     FROM events e
     JOIN sessions s ON s.session_id = e.session_id
     WHERE e.created_at BETWEEN ? AND ? AND s.is_excluded = 0
     GROUP BY day
     ORDER BY day ASC`,
  )
    .bind(query.from, query.to)
    .all<TrendRow>()

  return {
    pageViews: toNumber(row?.page_views),
    uniqueVisitors: toNumber(row?.unique_visitors),
    sessions: toNumber(row?.sessions),
    avgForegroundMs: Math.round(toNumber(row?.avg_foreground_ms)),
    resumeClicks: toNumber(row?.resume_clicks),
    contactClicks: toNumber(row?.contact_clicks),
    dailyTrend: trend.results.map((item) => ({
      day: item.day,
      pageViews: toNumber(item.page_views),
      visitors: toNumber(item.visitors),
    })),
  }
}

export interface ProjectRow {
  projectSlug: string
  projectName: string
  pageViews: number
  visitors: number
  avgForegroundMs: number
  resumeClicks: number
}

interface ProjectMetricRow {
  project_slug: string
  page_views: number
  visitors: number
  total_foreground_ms: number
  visit_sessions: number
  resume_clicks: number
}

const PROJECT_NAMES: Record<string, string> = {
  'structured-light-scanning': 'Structured Light Scanning',
  'mesh-processing': 'Mesh Processing',
  '3dgs-printing': '3DGS Printing',
  panohk360: 'PanoHK360',
  'lod2-building-reconstruction': 'LoD2 Building Reconstruction',
}

export async function computeProjectAnalytics(env: Env, query: RangeQuery): Promise<ProjectRow[]> {
  const data = await env.DB.prepare(
    `SELECT
       e.project_slug,
       SUM(CASE WHEN e.type = 'page_view' THEN 1 ELSE 0 END) AS page_views,
       COUNT(DISTINCT CASE WHEN e.type = 'page_view' THEN e.visitor_id END) AS visitors,
       COALESCE(SUM(CASE WHEN e.type = 'duration' THEN e.foreground_ms ELSE 0 END), 0) AS total_foreground_ms,
       COUNT(DISTINCT CASE WHEN e.type = 'page_view' THEN e.session_id END) AS visit_sessions,
       SUM(CASE WHEN e.type = 'action' AND e.action_name = 'resume_download' THEN 1 ELSE 0 END) AS resume_clicks
     FROM events e
     JOIN sessions s ON s.session_id = e.session_id
     WHERE e.created_at BETWEEN ? AND ?
       AND s.is_excluded = 0
       AND e.project_slug IS NOT NULL
     GROUP BY e.project_slug
     ORDER BY page_views DESC, e.project_slug ASC`,
  )
    .bind(query.from, query.to)
    .all<ProjectMetricRow>()

  return data.results.map((item) => {
    const sessions = toNumber(item.visit_sessions)
    return {
      projectSlug: item.project_slug,
      projectName: PROJECT_NAMES[item.project_slug] ?? item.project_slug,
      pageViews: toNumber(item.page_views),
      visitors: toNumber(item.visitors),
      avgForegroundMs: sessions ? Math.round(toNumber(item.total_foreground_ms) / sessions) : 0,
      resumeClicks: toNumber(item.resume_clicks),
    }
  })
}

function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}
