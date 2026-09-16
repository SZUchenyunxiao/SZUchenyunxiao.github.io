// 写入接口：POST /api/collect
// 职责：来源校验 → 限流 → 解析 → 去重 → 取出口 IP → 写 events/sessions/visitors
// 说明：核心 SQL 用伪代码/占位标注，落地时替换为真实 D1 语句。

import type { Env, CollectPayload } from './types'
import { json, corsHeaders } from './index'
import { checkRateLimit, isDuplicate } from './ratelimit'
import { getClientIP, parseUserAgent, classifyReferrer, ipPrefix } from './geo'

const SESSION_IDLE_MS = 30 * 60 * 1000 // 30 分钟无活动视为新会话

export async function handleCollect(request: Request, env: Env): Promise<Response> {
  // 1. 来源校验：只接受主站发来的写入
  const origin = request.headers.get('Origin') ?? ''
  if (env.ALLOWED_ORIGIN && origin !== env.ALLOWED_ORIGIN) {
    return json({ error: 'forbidden origin' }, 403, env)
  }

  // 2. 限流（按 IP + visitorId 粗粒度）
  const ip = getClientIP(request)
  if (!(await checkRateLimit(env, ip))) {
    return json({ error: 'rate limited' }, 429, env)
  }

  const payload = (await request.json()) as CollectPayload
  if (!payload?.visitorId || !payload?.sessionId || !payload?.type) {
    return json({ error: 'bad payload' }, 400, env)
  }

  // 3. 去重（幂等）：同 dedupKey 的事件只写一次
  if (payload.dedupKey && (await isDuplicate(env, payload.dedupKey))) {
    return json({ ok: true, deduped: true }, 200, env)
  }

  // 4. 排除规则：管理员本人 / 开发预览
  //   PSEUDO: settings = SELECT excluded_visitor_ids, excluded_ip_prefixes FROM settings
  //   if payload.visitorId in excluded OR ipPrefix(ip) in excluded_ip_prefixes -> is_excluded = 1
  const isExcluded = await isVisitorExcluded(env, payload.visitorId, ip)

  const now = Date.now()
  const ua = parseUserAgent(payload.userAgent ?? request.headers.get('User-Agent') ?? '')
  const referrerType = classifyReferrer(payload.referrer, env.ALLOWED_ORIGIN)
  const country = (request as any).cf?.country ?? null

  // 5. upsert visitor
  //   PSEUDO:
  //   INSERT INTO visitors(visitor_id, first_seen, last_seen, is_excluded)
  //   VALUES(?, ?, ?, ?)
  //   ON CONFLICT(visitor_id) DO UPDATE SET last_seen = excluded.last_seen
  await upsertVisitor(env, payload.visitorId, now, isExcluded)

  // 6. upsert session（判断是否需新建：同 sessionId 不存在，或超过空闲阈值）
  //   PSEUDO:
  //   s = SELECT * FROM sessions WHERE session_id = ?
  //   if !s: INSERT new session (started_at=now, ip, ip_prefix, referrer, device...)
  //   else if now - s.last_active_at > SESSION_IDLE_MS: (前端一般已换 sessionId)
  //   else: UPDATE last_active_at = now
  await upsertSession(env, {
    sessionId: payload.sessionId,
    visitorId: payload.visitorId,
    now,
    ip,
    ipPrefix: ipPrefix(ip),
    referrer: payload.referrer,
    referrerType,
    ua,
    country,
    isExcluded,
  })

  // 7. 按事件类型写 events + 更新 session 汇总
  switch (payload.type) {
    case 'page_view':
      // 每次打开页面 / 进入新项目详情 -> PV +1
      //   PSEUDO:
      //   INSERT INTO events(type='page_view', page_path, project_slug, ...)
      //   UPDATE sessions SET page_view_count = page_view_count + 1
      await insertPageView(env, payload, now)
      break

    case 'duration':
      // 定期上报的前台可见增量 -> 累加停留，但【不】增加 PV
      //   PSEUDO:
      //   INSERT INTO events(type='duration', foreground_ms, page_path, project_slug)
      //   UPDATE sessions SET total_foreground_ms = total_foreground_ms + foreground_ms
      await addForegroundTime(env, payload, now)
      break

    case 'action':
      // 关键操作：简历下载 / 邮箱 / GitHub 点击
      //   PSEUDO:
      //   INSERT INTO events(type='action', action_name, page_path, project_slug)
      //   UPDATE sessions SET clicked_resume/contact/github = 1 (对应项)
      await recordAction(env, payload, now)
      break
  }

  return json({ ok: true }, 200, env)
}

// ---- 下面为占位实现，落地时替换为真实 D1 prepared statements ----

async function isVisitorExcluded(_env: Env, _visitorId: string, _ip: string): Promise<boolean> {
  // PSEUDO: 查 settings 排除名单
  return false
}

async function upsertVisitor(_env: Env, _visitorId: string, _now: number, _excluded: boolean) {
  // PSEUDO: env.DB.prepare('INSERT ... ON CONFLICT ...').bind(...).run()
}

async function upsertSession(_env: Env, _s: unknown) {
  // PSEUDO: 见上方注释
}

async function insertPageView(_env: Env, _p: CollectPayload, _now: number) {
  // PSEUDO
}

async function addForegroundTime(_env: Env, _p: CollectPayload, _now: number) {
  // PSEUDO
}

async function recordAction(_env: Env, _p: CollectPayload, _now: number) {
  // PSEUDO
}

// 供 index 引用（避免未使用告警）
void corsHeaders
void SESSION_IDLE_MS
