// 后台查询接口（全部已通过 requireAdmin 鉴权）
//   GET /api/admin/overview?from&to
//   GET /api/admin/project-analytics?from&to
//   GET /api/admin/sessions?from&to&page
//   GET /api/admin/session?id=...
//   GET/POST /api/admin/settings

import type { Env } from './types'
import { json } from './index'
import { computeOverview, computeProjectAnalytics } from './metrics'

export async function handleAdminQuery(request: Request, env: Env, url: URL): Promise<Response> {
  const { pathname, searchParams } = url
  const from = Number(searchParams.get('from') ?? Date.now() - 7 * 864e5)
  const to = Number(searchParams.get('to') ?? Date.now())

  switch (pathname) {
    case '/api/admin/overview': {
      // PV / UV / 会话 / 平均停留(按会话) / 简历点击 / 邮箱点击 + 每日趋势
      const data = await computeOverview(env, { from, to })
      return json(data, 200, env)
    }

    case '/api/admin/project-analytics': {
      // 按项目汇总：浏览量 / 访客 / 平均停留(按该项目页面浏览) / 简历点击
      const data = await computeProjectAnalytics(env, { from, to })
      return json(data, 200, env)
    }

    case '/api/admin/sessions': {
      // 访问明细列表（分页）
      const page = Number(searchParams.get('page') ?? '1')
      const data = await listSessions(env, { from, to, page })
      return json(data, 200, env)
    }

    case '/api/admin/session': {
      // 单次会话详情：页面浏览顺序 + 关键操作
      const id = searchParams.get('id') ?? ''
      const data = await getSessionDetail(env, id)
      return json(data, 200, env)
    }

    case '/api/admin/settings': {
      if (request.method === 'POST') {
        const body = await request.json()
        await updateSettings(env, body)
        return json({ ok: true }, 200, env)
      }
      return json(await getSettings(env), 200, env)
    }

    default:
      return json({ error: 'not found' }, 404, env)
  }
}

// ---- 占位实现 ----

async function listSessions(_env: Env, _q: { from: number; to: number; page: number }) {
  // PSEUDO:
  // SELECT session_id, started_at, ip, referrer_type, device_type, browser,
  //        page_view_count, total_foreground_ms, clicked_resume, clicked_contact
  // FROM sessions
  // WHERE started_at BETWEEN ? AND ? AND is_excluded = 0
  // ORDER BY started_at DESC LIMIT 50 OFFSET (page-1)*50
  // 注意：完整 IP 仅在管理员接口返回
  return { items: [], page: _q.page, total: 0 }
}

async function getSessionDetail(_env: Env, _sessionId: string) {
  // PSEUDO:
  // SELECT type, page_path, project_slug, action_name, foreground_ms, created_at
  // FROM events WHERE session_id = ? ORDER BY created_at ASC
  // -> 组装成"页面浏览顺序 + 关键操作"时间线
  return { sessionId: _sessionId, timeline: [] }
}

async function getSettings(_env: Env) {
  // PSEUDO: SELECT * FROM settings WHERE id = 1
  return { timezone: 'Asia/Shanghai', retentionDays: 30, excludedVisitorIds: [], excludedIpPrefixes: [] }
}

async function updateSettings(_env: Env, _body: unknown) {
  // PSEUDO: UPDATE settings SET ... WHERE id = 1
}
