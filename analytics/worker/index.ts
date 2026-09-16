// 统计服务入口：路由分发
// 写入接口 (/api/collect) 与后台查询接口 (/api/admin/*) 分开管理，
// 查询接口全部要求管理员鉴权。

import type { Env } from './types'
import { handleCollect } from './collect'
import { handleLogin, requireAdmin } from './auth'
import { handleAdminQuery } from './query'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const { pathname } = url

    // CORS 预检（仅允许主站来源写入）
    if (request.method === 'OPTIONS') {
      return corsPreflight(env)
    }

    try {
      // --- 写入接口：公开，但有来源校验 + 限流 + 去重 ---
      if (pathname === '/api/collect' && request.method === 'POST') {
        return await handleCollect(request, env)
      }

      // --- 管理员登录：签发会话 token ---
      if (pathname === '/api/admin/login' && request.method === 'POST') {
        return await handleLogin(request, env)
      }

      // --- 后台查询接口：全部需要鉴权 ---
      if (pathname.startsWith('/api/admin/')) {
        const admin = await requireAdmin(request, env)
        if (!admin.ok) {
          return json({ error: 'unauthorized' }, 401)
        }
        // /api/admin/overview | /project-analytics | /sessions | /session/:id | /settings
        return await handleAdminQuery(request, env, url)
      }

      return json({ error: 'not found' }, 404)
    } catch (err) {
      // 不向外暴露内部错误细节
      console.error(err)
      return json({ error: 'internal error' }, 500)
    }
  },
}

export function corsHeaders(env: Env): HeadersInit {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

function corsPreflight(env: Env): Response {
  return new Response(null, { status: 204, headers: corsHeaders(env) })
}

export function json(data: unknown, status = 200, env?: Env): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...(env ? corsHeaders(env) : {}),
    },
  })
}
