import type { Env } from './types'
import { getClientIP } from './geo'
import { json } from './index'
import { checkRateLimitBucket } from './ratelimit'

const COOKIE_NAME = 'portfolio_admin'
const LOGIN_WINDOW_MS = 15 * 60 * 1000
const LOGIN_ATTEMPTS_PER_WINDOW = 8

interface LoginBody {
  password?: string
}

export async function handleLogin(request: Request, env: Env): Promise<Response> {
  const allowed = await checkRateLimitBucket(
    env,
    'admin-login',
    getClientIP(request),
    LOGIN_ATTEMPTS_PER_WINDOW,
    LOGIN_WINDOW_MS,
  )
  if (!allowed) {
    return json({ error: 'too many attempts' }, 429, env, { 'Retry-After': '900' })
  }

  let body: LoginBody
  try {
    body = (await request.json()) as LoginBody
  } catch {
    return json({ error: 'invalid request' }, 400, env)
  }

  const password = typeof body.password === 'string' ? body.password : ''
  if (!password || !(await verifyPassword(password, env.ADMIN_PASSWORD_HASH))) {
    return json({ error: 'invalid credentials' }, 401, env)
  }

  const now = Date.now()
  const hours = clamp(Number(env.ADMIN_SESSION_HOURS || '12'), 1, 168)
  const expiresAt = now + hours * 60 * 60 * 1000
  const token = randomToken()
  const sessionHash = await digestToken(token, env.SESSION_TOKEN_PEPPER)

  await env.DB.prepare(
    `INSERT INTO admin_sessions (session_hash, username, created_at, expires_at)
     VALUES (?, 'admin', ?, ?)`,
  )
    .bind(sessionHash, now, expiresAt)
    .run()

  return json(
    { ok: true },
    200,
    env,
    { 'Set-Cookie': sessionCookie(token, Math.floor((expiresAt - now) / 1000)) },
  )
}

export async function handleLogout(request: Request, env: Env): Promise<Response> {
  const token = readCookie(request, COOKIE_NAME)
  if (token) {
    const sessionHash = await digestToken(token, env.SESSION_TOKEN_PEPPER)
    await env.DB.prepare('DELETE FROM admin_sessions WHERE session_hash = ?')
      .bind(sessionHash)
      .run()
  }

  return json(
    { ok: true },
    200,
    env,
    { 'Set-Cookie': sessionCookie('', 0) },
  )
}

export async function requireAdmin(
  request: Request,
  env: Env,
): Promise<{ ok: boolean; username?: string }> {
  const token = readCookie(request, COOKIE_NAME)
  if (!token) return { ok: false }

  const sessionHash = await digestToken(token, env.SESSION_TOKEN_PEPPER)
  const session = await env.DB.prepare(
    `SELECT username, expires_at
     FROM admin_sessions
     WHERE session_hash = ? AND expires_at > ?`,
  )
    .bind(sessionHash, Date.now())
    .first<{ username: string; expires_at: number }>()

  if (!session) return { ok: false }
  return { ok: true, username: session.username }
}

async function verifyPassword(plain: string, encoded: string): Promise<boolean> {
  const [algorithm, expectedRaw] = encoded.split('$')
  if (algorithm !== 'sha256' || !expectedRaw) return false
  try {
    const expected = decodeBase64Url(expectedRaw)
    const derived = new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(plain)),
    )
    return constantTimeEqual(derived, expected)
  } catch {
    return false
  }
}

async function digestToken(token: string, pepper: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pepper),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(token))
  return encodeBase64Url(new Uint8Array(signature))
}

function randomToken(): string {
  return encodeBase64Url(crypto.getRandomValues(new Uint8Array(32)))
}

function readCookie(request: Request, name: string): string {
  const cookies = request.headers.get('Cookie') ?? ''
  for (const part of cookies.split(';')) {
    const [key, ...value] = part.trim().split('=')
    if (key === name) return decodeURIComponent(value.join('='))
  }
  return ''
}

function sessionCookie(token: string, maxAge: number): string {
  return [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
    `Max-Age=${maxAge}`,
  ].join('; ')
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false
  let result = 0
  for (let i = 0; i < left.byteLength; i += 1) result |= left[i] ^ right[i]
  return result === 0
}

function decodeBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0))
}

function encodeBase64Url(value: Uint8Array): string {
  let binary = ''
  for (const byte of value) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}
