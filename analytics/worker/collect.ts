import type { CollectPayload, Env } from './types'
import { classifyReferrer, getClientIP, ipPrefix, parseUserAgent } from './geo'
import { corsHeaders, json } from './index'
import { checkRateLimit } from './ratelimit'

const IDENTIFIER_RE = /^[a-zA-Z0-9_-]{8,80}$/
const PROJECT_RE = /^[a-z0-9-]{1,80}$/
const ACTIONS = new Set(['resume_download', 'contact_email', 'github_link'])
const EVENT_TYPES = new Set(['page_view', 'duration', 'action'])

interface SessionInput {
  sessionId: string
  visitorId: string
  now: number
  ip: string
  ipPrefix: string
  referrer: string | null
  referrerType: string
  ua: { device: string; browser: string; os: string }
  country: string | null
  isExcluded: boolean
}

export async function handleCollect(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get('Origin') ?? ''
  if (!env.ALLOWED_ORIGIN || origin !== env.ALLOWED_ORIGIN) {
    return json({ error: 'forbidden origin' }, 403, env)
  }

  const contentLength = Number(request.headers.get('Content-Length') ?? '0')
  if (contentLength > 16_384) return json({ error: 'payload too large' }, 413, env)

  const ip = getClientIP(request)
  if (!(await checkRateLimit(env, ip))) {
    return json({ error: 'rate limited' }, 429, env, { 'Retry-After': '60' })
  }

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return json({ error: 'invalid json' }, 400, env)
  }

  const payload = sanitizePayload(raw)
  if (!payload) return json({ error: 'invalid payload' }, 400, env)

  const now = Date.now()
  const excluded = await isVisitorExcluded(env, payload.visitorId, ip)
  const referrer = trimText(payload.referrer, 1024) || null
  const ua = parseUserAgent(request.headers.get('User-Agent') ?? '')
  const country = trimText((request as Request & { cf?: { country?: string } }).cf?.country, 8) || null

  await upsertVisitor(env, payload.visitorId, now, excluded)
  await upsertSession(env, {
    sessionId: payload.sessionId,
    visitorId: payload.visitorId,
    now,
    ip: trimText(ip, 64),
    ipPrefix: ipPrefix(ip),
    referrer,
    referrerType: classifyReferrer(referrer ?? undefined, env.ALLOWED_ORIGIN),
    ua,
    country,
    isExcluded: excluded,
  })

  const inserted = await insertEvent(env, payload, now)
  if (!inserted) return json({ ok: true, deduped: true }, 200, env)

  await updateSessionSummary(env, payload, now)
  return json({ ok: true }, 200, env)
}

function sanitizePayload(value: unknown): CollectPayload | null {
  if (!value || typeof value !== 'object') return null
  const input = value as Partial<CollectPayload>
  if (
    typeof input.visitorId !== 'string' ||
    typeof input.sessionId !== 'string' ||
    typeof input.dedupKey !== 'string' ||
    typeof input.type !== 'string' ||
    !IDENTIFIER_RE.test(input.visitorId) ||
    !IDENTIFIER_RE.test(input.sessionId) ||
    !IDENTIFIER_RE.test(input.dedupKey) ||
    !EVENT_TYPES.has(input.type)
  ) {
    return null
  }

  const pagePath = trimText(input.pagePath, 256)
  const projectSlug = trimText(input.projectSlug, 80)
  if (pagePath && !pagePath.startsWith('/')) return null
  if (projectSlug && !PROJECT_RE.test(projectSlug)) return null

  if (input.type === 'duration') {
    if (
      typeof input.foregroundMs !== 'number' ||
      !Number.isFinite(input.foregroundMs) ||
      input.foregroundMs <= 0 ||
      input.foregroundMs > 10 * 60 * 1000
    ) {
      return null
    }
  }
  if (input.type === 'action' && (!input.actionName || !ACTIONS.has(input.actionName))) {
    return null
  }

  return {
    visitorId: input.visitorId,
    sessionId: input.sessionId,
    dedupKey: input.dedupKey,
    type: input.type,
    pagePath: pagePath || undefined,
    projectSlug: projectSlug || undefined,
    foregroundMs: input.type === 'duration' ? Math.round(input.foregroundMs!) : undefined,
    actionName: input.type === 'action' ? input.actionName : undefined,
    referrer: trimText(input.referrer, 1024) || undefined,
    ts: typeof input.ts === 'number' ? input.ts : Date.now(),
  }
}

async function isVisitorExcluded(env: Env, visitorId: string, ip: string): Promise<boolean> {
  const settings = await env.DB.prepare(
    'SELECT excluded_visitor_ids, excluded_ip_prefixes FROM settings WHERE id = 1',
  ).first<{ excluded_visitor_ids: string; excluded_ip_prefixes: string }>()

  const visitorIds = parseStringArray(settings?.excluded_visitor_ids)
  const ipPrefixes = parseStringArray(settings?.excluded_ip_prefixes)
  return visitorIds.includes(visitorId) || ipPrefixes.includes(ipPrefix(ip))
}

async function upsertVisitor(env: Env, visitorId: string, now: number, excluded: boolean) {
  await env.DB.prepare(
    `INSERT INTO visitors (visitor_id, first_seen, last_seen, is_excluded)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(visitor_id) DO UPDATE SET
       last_seen = excluded.last_seen,
       is_excluded = MAX(visitors.is_excluded, excluded.is_excluded)`,
  )
    .bind(visitorId, now, now, excluded ? 1 : 0)
    .run()
}

async function upsertSession(env: Env, input: SessionInput) {
  await env.DB.prepare(
    `INSERT INTO sessions (
       session_id, visitor_id, started_at, last_active_at, ip, ip_prefix,
       referrer, referrer_type, device_type, browser, os, country, is_excluded
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(session_id) DO UPDATE SET
       last_active_at = excluded.last_active_at,
       is_excluded = MAX(sessions.is_excluded, excluded.is_excluded)`,
  )
    .bind(
      input.sessionId,
      input.visitorId,
      input.now,
      input.now,
      input.ip,
      input.ipPrefix,
      input.referrer,
      input.referrerType,
      input.ua.device,
      input.ua.browser,
      input.ua.os,
      input.country,
      input.isExcluded ? 1 : 0,
    )
    .run()
}

async function insertEvent(env: Env, payload: CollectPayload, now: number): Promise<boolean> {
  const result = await env.DB.prepare(
    `INSERT OR IGNORE INTO events (
       session_id, visitor_id, type, page_path, project_slug,
       foreground_ms, action_name, created_at, dedup_key
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      payload.sessionId,
      payload.visitorId,
      payload.type,
      payload.pagePath ?? null,
      payload.projectSlug ?? null,
      payload.foregroundMs ?? null,
      payload.actionName ?? null,
      now,
      payload.dedupKey,
    )
    .run()

  return (result.meta.changes ?? 0) > 0
}

async function updateSessionSummary(env: Env, payload: CollectPayload, now: number) {
  if (payload.type === 'page_view') {
    await env.DB.prepare(
      `UPDATE sessions
       SET page_view_count = page_view_count + 1, last_active_at = ?
       WHERE session_id = ?`,
    )
      .bind(now, payload.sessionId)
      .run()
    return
  }

  if (payload.type === 'duration') {
    await env.DB.prepare(
      `UPDATE sessions
       SET total_foreground_ms = total_foreground_ms + ?, last_active_at = ?
       WHERE session_id = ?`,
    )
      .bind(payload.foregroundMs ?? 0, now, payload.sessionId)
      .run()
    return
  }

  const columns: Record<string, string> = {
    resume_download: 'clicked_resume',
    contact_email: 'clicked_contact',
    github_link: 'clicked_github',
  }
  const column = columns[payload.actionName ?? '']
  if (!column) return

  await env.DB.prepare(
    `UPDATE sessions SET ${column} = 1, last_active_at = ? WHERE session_id = ?`,
  )
    .bind(now, payload.sessionId)
    .run()
}

function trimText(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function parseStringArray(value: string | undefined): string[] {
  try {
    const parsed = JSON.parse(value ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

void corsHeaders
