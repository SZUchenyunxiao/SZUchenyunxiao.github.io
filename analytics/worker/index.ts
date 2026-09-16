import type { Env } from './types'
import { handleCollect } from './collect'
import { handleLogin, handleLogout, requireAdmin } from './auth'
import { handleAdminQuery } from './query'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const { pathname } = url

    if (request.method === 'OPTIONS' && pathname.startsWith('/api/')) {
      return corsPreflight(request, env)
    }

    try {
      if (pathname === '/api/collect' && request.method === 'POST') {
        return await handleCollect(request, env)
      }

      if (pathname === '/api/admin/login' && request.method === 'POST') {
        return await handleLogin(request, env)
      }

      if (pathname === '/api/admin/logout' && request.method === 'POST') {
        return await handleLogout(request, env)
      }

      if (pathname.startsWith('/api/admin/')) {
        const admin = await requireAdmin(request, env)
        if (!admin.ok) return json({ error: 'unauthorized' }, 401, env)
        return await handleAdminQuery(request, env, url)
      }

      if (pathname.startsWith('/api/')) return json({ error: 'not found' }, 404, env)
      return env.ASSETS.fetch(request)
    } catch (error) {
      console.error('analytics worker error', error)
      return json({ error: 'internal error' }, 500, env)
    }
  },

  async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
    const now = Date.now()
    const settings = await env.DB.prepare(
      'SELECT retention_days FROM settings WHERE id = 1',
    ).first<{ retention_days: number }>()
    const retentionDays = Math.min(365, Math.max(7, Number(settings?.retention_days ?? 30)))
    const retentionCutoff = now - retentionDays * 864e5
    await env.DB.batch([
      env.DB.prepare('DELETE FROM admin_sessions WHERE expires_at <= ?').bind(now),
      env.DB.prepare('DELETE FROM rate_limits WHERE expires_at <= ?').bind(now),
      env.DB.prepare('DELETE FROM events WHERE created_at < ?').bind(retentionCutoff),
      env.DB.prepare('DELETE FROM sessions WHERE last_active_at < ?').bind(retentionCutoff),
      env.DB.prepare('DELETE FROM visitors WHERE last_seen < ?').bind(retentionCutoff),
    ])
  },
}

export function corsHeaders(env: Env): HeadersInit {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
    Vary: 'Origin',
  }
}

function corsPreflight(request: Request, env: Env): Response {
  const origin = request.headers.get('Origin') ?? ''
  if (origin !== env.ALLOWED_ORIGIN) return new Response(null, { status: 403 })
  return new Response(null, { status: 204, headers: corsHeaders(env) })
}

export function json(
  data: unknown,
  status = 200,
  env?: Env,
  extraHeaders: HeadersInit = {},
): Response {
  const headers = new Headers(env ? corsHeaders(env) : undefined)
  headers.set('Content-Type', 'application/json; charset=utf-8')
  headers.set('Cache-Control', 'no-store')
  new Headers(extraHeaders).forEach((value, key) => headers.set(key, value))
  return new Response(JSON.stringify(data), { status, headers })
}
