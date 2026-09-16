import type { Env } from './types'
import { json } from './index'
import { computeOverview, computeProjectAnalytics } from './metrics'

const PAGE_SIZE = 50
const MAX_RANGE_MS = 366 * 864e5

export async function handleAdminQuery(request: Request, env: Env, url: URL): Promise<Response> {
  const { pathname, searchParams } = url
  const range = parseRange(searchParams)
  if (!range) return json({ error: 'invalid date range' }, 400, env)

  switch (pathname) {
    case '/api/admin/overview':
      if (request.method !== 'GET') return methodNotAllowed(env)
      return json(await computeOverview(env, range), 200, env)

    case '/api/admin/project-analytics':
      if (request.method !== 'GET') return methodNotAllowed(env)
      return json(await computeProjectAnalytics(env, range), 200, env)

    case '/api/admin/sessions': {
      if (request.method !== 'GET') return methodNotAllowed(env)
      const page = clampInt(Number(searchParams.get('page') ?? '1'), 1, 100_000)
      return json(await listSessions(env, { ...range, page }), 200, env)
    }

    case '/api/admin/session': {
      if (request.method !== 'GET') return methodNotAllowed(env)
      const id = searchParams.get('id') ?? ''
      if (!/^[a-zA-Z0-9_-]{8,80}$/.test(id)) return json({ error: 'invalid session id' }, 400, env)
      return json(await getSessionDetail(env, id), 200, env)
    }

    case '/api/admin/settings':
      if (request.method === 'GET') return json(await getSettings(env), 200, env)
      if (request.method === 'POST') {
        let body: unknown
        try {
          body = await request.json()
        } catch {
          return json({ error: 'invalid json' }, 400, env)
        }
        const settings = validateSettings(body)
        if (!settings) return json({ error: 'invalid settings' }, 400, env)
        await updateSettings(env, settings)
        return json({ ok: true }, 200, env)
      }
      return methodNotAllowed(env)

    default:
      return json({ error: 'not found' }, 404, env)
  }
}

interface SessionRow {
  session_id: string
  visitor_id: string
  started_at: number
  ip: string | null
  referrer_type: string | null
  device_type: string | null
  browser: string | null
  os: string | null
  country: string | null
  page_view_count: number
  total_foreground_ms: number
  clicked_resume: number
  clicked_contact: number
}

async function listSessions(env: Env, query: { from: number; to: number; page: number }) {
  const offset = (query.page - 1) * PAGE_SIZE
  const [countRow, rows] = await Promise.all([
    env.DB.prepare(
      `SELECT COUNT(*) AS total
       FROM sessions
       WHERE started_at BETWEEN ? AND ? AND is_excluded = 0`,
    )
      .bind(query.from, query.to)
      .first<{ total: number }>(),
    env.DB.prepare(
      `SELECT session_id, visitor_id, started_at, ip, referrer_type, device_type, browser, os, country,
              page_view_count, total_foreground_ms, clicked_resume, clicked_contact
       FROM sessions
       WHERE started_at BETWEEN ? AND ? AND is_excluded = 0
       ORDER BY started_at DESC
       LIMIT ? OFFSET ?`,
    )
      .bind(query.from, query.to, PAGE_SIZE, offset)
      .all<SessionRow>(),
  ])

  return {
    items: rows.results.map((row) => ({
      sessionId: row.session_id,
      visitorId: row.visitor_id,
      startedAt: row.started_at,
      ip: row.ip,
      referrerType: row.referrer_type ?? 'unknown',
      deviceType: row.device_type ?? 'unknown',
      browser: row.browser ?? 'unknown',
      os: row.os ?? 'unknown',
      country: row.country ?? '—',
      pageViewCount: row.page_view_count,
      totalForegroundMs: row.total_foreground_ms,
      clickedResume: Boolean(row.clicked_resume),
      clickedContact: Boolean(row.clicked_contact),
    })),
    page: query.page,
    pageSize: PAGE_SIZE,
    total: Number(countRow?.total ?? 0),
  }
}

interface EventRow {
  type: string
  page_path: string | null
  project_slug: string | null
  action_name: string | null
  foreground_ms: number | null
  created_at: number
}

async function getSessionDetail(env: Env, sessionId: string) {
  const rows = await env.DB.prepare(
    `SELECT type, page_path, project_slug, action_name, foreground_ms, created_at
     FROM events
     WHERE session_id = ?
     ORDER BY created_at ASC, id ASC
     LIMIT 1000`,
  )
    .bind(sessionId)
    .all<EventRow>()

  return {
    sessionId,
    timeline: rows.results.map((row) => ({
      type: row.type,
      pagePath: row.page_path,
      projectSlug: row.project_slug,
      actionName: row.action_name,
      foregroundMs: row.foreground_ms,
      createdAt: row.created_at,
    })),
  }
}

interface StoredSettings {
  timezone: string
  retention_days: number
  excluded_visitor_ids: string
  excluded_ip_prefixes: string
}

async function getSettings(env: Env) {
  const row = await env.DB.prepare(
    `SELECT timezone, retention_days, excluded_visitor_ids, excluded_ip_prefixes
     FROM settings WHERE id = 1`,
  ).first<StoredSettings>()

  return {
    timezone: row?.timezone ?? 'Asia/Shanghai',
    retentionDays: row?.retention_days ?? 30,
    excludedVisitorIds: parseStringArray(row?.excluded_visitor_ids),
    excludedIpPrefixes: parseStringArray(row?.excluded_ip_prefixes),
  }
}

interface SettingsInput {
  timezone: string
  retentionDays: number
  excludedVisitorIds: string[]
  excludedIpPrefixes: string[]
}

async function updateSettings(env: Env, settings: SettingsInput) {
  await env.DB.prepare(
    `UPDATE settings
     SET timezone = ?, retention_days = ?, excluded_visitor_ids = ?, excluded_ip_prefixes = ?
     WHERE id = 1`,
  )
    .bind(
      settings.timezone,
      settings.retentionDays,
      JSON.stringify(settings.excludedVisitorIds),
      JSON.stringify(settings.excludedIpPrefixes),
    )
    .run()
}

function parseRange(params: URLSearchParams): { from: number; to: number } | null {
  const now = Date.now()
  const from = Number(params.get('from') ?? now - 7 * 864e5)
  const to = Number(params.get('to') ?? now)
  if (!Number.isFinite(from) || !Number.isFinite(to) || from < 0 || to < from) return null
  if (to - from > MAX_RANGE_MS) return null
  return { from: Math.floor(from), to: Math.floor(to) }
}

function validateSettings(value: unknown): SettingsInput | null {
  if (!value || typeof value !== 'object') return null
  const input = value as Partial<SettingsInput>
  const timezone = input.timezone ?? 'Asia/Shanghai'
  const retentionDays = input.retentionDays ?? 30
  const visitorIds = normalizeStringArray(input.excludedVisitorIds, 80)
  const ipPrefixes = normalizeStringArray(input.excludedIpPrefixes, 64)
  if (
    timezone !== 'Asia/Shanghai' ||
    !Number.isInteger(retentionDays) ||
    retentionDays < 7 ||
    retentionDays > 365 ||
    !visitorIds ||
    !ipPrefixes
  ) {
    return null
  }
  return { timezone, retentionDays, excludedVisitorIds: visitorIds, excludedIpPrefixes: ipPrefixes }
}

function normalizeStringArray(value: unknown, maxItemLength: number): string[] | null {
  if (value === undefined) return []
  if (!Array.isArray(value) || value.length > 100) return null
  const result = value.map((item) => (typeof item === 'string' ? item.trim() : ''))
  if (result.some((item) => !item || item.length > maxItemLength)) return null
  return [...new Set(result)]
}

function parseStringArray(value: string | undefined): string[] {
  try {
    const parsed = JSON.parse(value ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, Math.floor(value)))
}

function methodNotAllowed(env: Env): Response {
  return json({ error: 'method not allowed' }, 405, env, { Allow: 'GET, POST' })
}
