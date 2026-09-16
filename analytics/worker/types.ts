// 统计服务共享类型

export interface Env {
  DB: D1Database
  ASSETS: Fetcher
  ALLOWED_ORIGIN: string
  ADMIN_SESSION_HOURS: string
  ADMIN_PASSWORD_HASH: string // secret: sha256$base64url
  SESSION_TOKEN_PEPPER: string // secret
}

// 前端埋点上报的事件（POST /api/collect）
export interface CollectPayload {
  visitorId: string
  sessionId: string
  type: 'page_view' | 'duration' | 'action'
  pagePath?: string
  projectSlug?: string
  foregroundMs?: number
  actionName?: 'resume_download' | 'contact_email' | 'github_link'
  referrer?: string
  // 设备信息可由前端粗解析，也可后端从 User-Agent 解析
  userAgent?: string
  // 幂等去重键（前端生成，同一事件重发不重复计数）
  dedupKey?: string
  ts: number // 客户端时间戳
}

export interface RangeQuery {
  from: number // epoch ms
  to: number
  projectSlug?: string
}

export interface OverviewMetrics {
  pageViews: number
  uniqueVisitors: number
  sessions: number
  avgForegroundMs: number
  resumeClicks: number
  contactClicks: number
  dailyTrend: { day: string; pageViews: number; visitors: number }[]
  breakdowns: {
    sources: { label: string; value: number }[]
    devices: { label: string; value: number }[]
    browsers: { label: string; value: number }[]
    countries: { label: string; value: number }[]
  }
}
