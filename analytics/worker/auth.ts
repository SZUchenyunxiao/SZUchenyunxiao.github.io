// 管理员鉴权：登录签发 token，查询接口校验 token
// 关键：后台数据保护必须靠鉴权，不能只靠隐藏入口。

import type { Env } from './types'
import { json } from './index'

interface LoginBody {
  username: string
  password: string
}

export async function handleLogin(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as LoginBody

  // 1. 校验密码：比对哈希（用 Web Crypto，慢哈希更佳，这里示意 SHA-256 + 盐）
  //   PSEUDO:
  //   const hash = await sha256(body.password + SALT)
  //   const ok = timingSafeEqual(hash, env.ADMIN_PASSWORD_HASH)
  const ok = await verifyPassword(body.password, env.ADMIN_PASSWORD_HASH)
  if (!body.username || !ok) {
    // 登录失败也做基本限流，防暴力破解（伪代码）
    return json({ error: 'invalid credentials' }, 401, env)
  }

  // 2. 签发会话 token（JWT，HMAC-SHA256，含过期时间）
  const hours = Number(env.ADMIN_SESSION_HOURS || '12')
  const token = await signJwt(
    { sub: body.username, exp: Date.now() + hours * 3600 * 1000 },
    env.JWT_SECRET,
  )
  return json({ ok: true, token }, 200, env)
}

// 查询接口调用：校验 Authorization: Bearer <token>
export async function requireAdmin(
  request: Request,
  env: Env,
): Promise<{ ok: boolean; username?: string }> {
  const auth = request.headers.get('Authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) return { ok: false }

  const payload = await verifyJwt(token, env.JWT_SECRET)
  if (!payload || (payload.exp as number) < Date.now()) return { ok: false }
  return { ok: true, username: payload.sub as string }
}

// ---- 占位密码/JWT 实现（落地时用 Web Crypto 完整实现）----

async function verifyPassword(_plain: string, _hash: string): Promise<boolean> {
  // PSEUDO: return timingSafeEqual(await sha256(plain + SALT), hash)
  return false
}

async function signJwt(_payload: Record<string, unknown>, _secret: string): Promise<string> {
  // PSEUDO: base64url(header).base64url(payload).HMAC_SHA256(...)
  return 'PSEUDO.JWT.TOKEN'
}

async function verifyJwt(
  _token: string,
  _secret: string,
): Promise<Record<string, unknown> | null> {
  // PSEUDO: 拆分校验签名与 exp，返回 payload 或 null
  return null
}
