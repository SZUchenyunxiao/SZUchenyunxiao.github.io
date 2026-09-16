// 前端埋点 SDK（嵌入个人主页）
// 负责：建立匿名访客/会话标识、上报 page_view、定期上报前台停留、关键操作、离开补报。
// 设计要点见 README「五、数据采集流程」。

interface TrackerConfig {
  endpoint: string // 统计服务地址，如 https://portfolio-analytics.<account>.workers.dev/api/collect
}

const SESSION_IDLE_MS = 30 * 60 * 1000
const HEARTBEAT_MS = 30 * 1000 // 降低 Worker/D1 写入量，同时保留足够的停留精度

let cfg: TrackerConfig
let initialized = false
let visitorId = ''
let sessionId = ''
let lastActive = Date.now()
let foregroundAccumMs = 0 // 自上次上报以来的前台可见时长
let lastTick = Date.now()
let currentPath = location.pathname
let currentProject: string | null = null
let lastPageViewKey = ''
let lastPageViewAt = 0

// ---- 标识管理 ----

function getOrCreateVisitorId(): string {
  // 匿名浏览器标识；跨设备/浏览器会不同（UV 只是估算）
  let id = localStorage.getItem('an_vid')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('an_vid', id)
  }
  return id
}

function getOrCreateSessionId(): string {
  // 连续 30 分钟无活动 -> 新会话
  const raw = sessionStorage.getItem('an_sid')
  const lastTs = Number(sessionStorage.getItem('an_sid_ts') ?? '0')
  if (raw && Date.now() - lastTs < SESSION_IDLE_MS) {
    return raw
  }
  const id = crypto.randomUUID()
  sessionStorage.setItem('an_sid', id)
  sessionStorage.setItem('an_sid_ts', String(Date.now()))
  return id
}

function touchSession() {
  if (Date.now() - lastActive >= SESSION_IDLE_MS) {
    sessionId = crypto.randomUUID()
    sessionStorage.setItem('an_sid', sessionId)
  }
  lastActive = Date.now()
  sessionStorage.setItem('an_sid_ts', String(lastActive))
}

// ---- 上报 ----

function send(body: Record<string, unknown>, useBeacon = false) {
  if (!cfg?.endpoint) return
  const payload = JSON.stringify({
    visitorId,
    sessionId,
    referrer: document.referrer || undefined,
    userAgent: navigator.userAgent,
    ts: Date.now(),
    dedupKey: crypto.randomUUID(), // 每次事件唯一；离开补报时可复用避免重复
    ...body,
  })
  // 离开页面时用 sendBeacon，保证请求能发出去
  if (useBeacon && navigator.sendBeacon) {
    navigator.sendBeacon(cfg.endpoint, payload)
    return
  }
  fetch(cfg.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => {
    /* 网络失败静默；可能造成部分遗漏，符合口径说明 */
  })
}

// ---- 对外 API ----

export function initAnalytics(config: TrackerConfig) {
  if (initialized || !config.endpoint) return
  initialized = true
  cfg = config
  visitorId = getOrCreateVisitorId()
  sessionId = getOrCreateSessionId()

  startHeartbeat()
  bindVisibility()
  bindUnload()
}

// 打开页面 / 进入新的项目详情 -> 一次 PV
export function trackPageView(path: string, projectSlug?: string) {
  if (!initialized) return
  const now = Date.now()
  const pageViewKey = `${path}:${projectSlug ?? ''}`
  if (pageViewKey === lastPageViewKey && now - lastPageViewAt < 1000) return
  lastPageViewKey = pageViewKey
  lastPageViewAt = now
  flushForeground() // 切页前先结算上一页停留
  currentPath = path
  currentProject = projectSlug ?? null
  touchSession()
  send({ type: 'page_view', pagePath: path, projectSlug })
}

// 关键操作：简历 / 邮箱 / GitHub
export function trackAction(
  actionName: 'resume_download' | 'contact_email' | 'github_link',
) {
  if (!initialized) return
  touchSession()
  send({
    type: 'action',
    actionName,
    pagePath: currentPath,
    projectSlug: currentProject ?? undefined,
  })
}

// ---- 前台停留统计（仅可见时累计）----

function tickForeground() {
  const now = Date.now()
  if (document.visibilityState === 'visible') {
    foregroundAccumMs += now - lastTick
  }
  lastTick = now
}

function flushForeground(useBeacon = false) {
  tickForeground()
  if (foregroundAccumMs <= 0) return
  send(
    {
      type: 'duration',
      foregroundMs: foregroundAccumMs,
      pagePath: currentPath,
      projectSlug: currentProject ?? undefined,
    },
    useBeacon,
  )
  foregroundAccumMs = 0
}

function startHeartbeat() {
  lastTick = Date.now()
  setInterval(() => {
    tickForeground()
    // 定期上报增量（不增加 PV）
    if (foregroundAccumMs >= HEARTBEAT_MS) flushForeground()
  }, HEARTBEAT_MS)
}

function bindVisibility() {
  document.addEventListener('visibilitychange', () => {
    // 切后台/最小化：结算并暂停；回到前台：重置计时基准
    tickForeground()
    if (document.visibilityState === 'hidden') flushForeground()
    else lastTick = Date.now()
  })
}

function bindUnload() {
  // 离开页面尽力补报（beacon）
  window.addEventListener('pagehide', () => flushForeground(true))
  window.addEventListener('beforeunload', () => flushForeground(true))
}
