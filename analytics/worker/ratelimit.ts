import type { Env } from './types'

const COLLECT_WINDOW_MS = 60 * 1000
const COLLECT_MAX_PER_WINDOW = 180

export function checkRateLimit(env: Env, ip: string): Promise<boolean> {
  return checkRateLimitBucket(
    env,
    'collect',
    ip,
    COLLECT_MAX_PER_WINDOW,
    COLLECT_WINDOW_MS,
  )
}

export async function checkRateLimitBucket(
  env: Env,
  scope: string,
  identity: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  const now = Date.now()
  const windowStart = Math.floor(now / windowMs) * windowMs
  const identityHash = await sha256(`${scope}:${identity}`)
  const bucketKey = `${scope}:${identityHash}:${windowStart}`
  const result = await env.DB.prepare(
    `INSERT INTO rate_limits (bucket_key, window_start, request_count, expires_at)
     VALUES (?, ?, 1, ?)
     ON CONFLICT(bucket_key) DO UPDATE SET request_count = request_count + 1
     RETURNING request_count`,
  )
    .bind(bucketKey, windowStart, windowStart + windowMs * 2)
    .first<{ request_count: number }>()

  return (result?.request_count ?? limit + 1) <= limit
}

export async function isDuplicate(env: Env, dedupKey: string): Promise<boolean> {
  const row = await env.DB.prepare('SELECT 1 AS found FROM events WHERE dedup_key = ? LIMIT 1')
    .bind(dedupKey)
    .first<{ found: number }>()
  return Boolean(row)
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}
