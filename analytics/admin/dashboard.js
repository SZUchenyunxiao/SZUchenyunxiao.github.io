// 管理后台前端逻辑：登录取 token -> 带 token 查询各接口 -> 渲染。
// 与主站解耦；可单独部署（如 Cloudflare Pages），或作为 Worker 的受保护路由。

const API_BASE = 'https://portfolio-analytics.xxx.workers.dev' // TODO: 换成你的 Worker 域名
const IS_LOCAL_PREVIEW = ['127.0.0.1', 'localhost'].includes(location.hostname)
const LOCAL_PREVIEW_PASSWORD = globalThis.ANALYTICS_LOCAL_PASSWORD || ''
const LOCAL_PREVIEW_TOKEN = 'local-preview'

const state = {
  token: sessionStorage.getItem('an_admin_token') || '',
  from: Date.now() - 7 * 864e5,
  to: Date.now(),
}

// ---- 通用请求：自动带上 Bearer token ----
async function api(path, opts = {}) {
  if (IS_LOCAL_PREVIEW && state.token === LOCAL_PREVIEW_TOKEN) {
    if (path.startsWith('/api/admin/overview')) {
      return {
        pageViews: 0,
        uniqueVisitors: 0,
        sessions: 0,
        avgForegroundMs: 0,
        resumeClicks: 0,
        contactClicks: 0,
        dailyTrend: [],
      }
    }
    if (path.startsWith('/api/admin/project-analytics')) return []
    if (path.startsWith('/api/admin/sessions')) return { items: [], page: 1, total: 0 }
    if (path.startsWith('/api/admin/session')) return { sessionId: '', timeline: [] }
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
      ...(opts.headers || {}),
    },
  })
  if (res.status === 401) {
    // token 失效 -> 回登录
    showLogin()
    throw new Error('unauthorized')
  }
  return res.json()
}

// ---- 登录 ----
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  const password = document.getElementById('password').value

  if (IS_LOCAL_PREVIEW && LOCAL_PREVIEW_PASSWORD) {
    if (password === LOCAL_PREVIEW_PASSWORD) {
      state.token = LOCAL_PREVIEW_TOKEN
      sessionStorage.setItem('an_admin_token', state.token)
      document.getElementById('login-error').textContent = ''
      showDashboard()
    } else {
      document.getElementById('login-error').textContent = 'Incorrect password'
    }
    return
  }

  try {
    const r = await api('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password }),
    })
    if (r.ok && r.token) {
      state.token = r.token
      sessionStorage.setItem('an_admin_token', r.token)
      showDashboard()
    } else {
      document.getElementById('login-error').textContent = 'Incorrect password'
    }
  } catch {
    document.getElementById('login-error').textContent = 'Unable to sign in'
  }
})

document.getElementById('logout')?.addEventListener('click', () => {
  state.token = ''
  sessionStorage.removeItem('an_admin_token')
  showLogin()
})

// ---- 时间范围 ----
document.querySelectorAll('[data-range]').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.from = Date.now() - Number(btn.dataset.range) * 864e5
    state.to = Date.now()
    loadAll()
  })
})
document.getElementById('apply-range')?.addEventListener('click', () => {
  const from = document.getElementById('from-date').value
  const to = document.getElementById('to-date').value
  if (from) state.from = new Date(from).getTime()
  if (to) state.to = new Date(to).getTime() + 864e5 - 1
  loadAll()
})

// ---- 视图切换 ----
function showLogin() {
  document.getElementById('login-view').classList.remove('hidden')
  document.getElementById('dashboard-view').classList.add('hidden')
}
function showDashboard() {
  document.getElementById('login-view').classList.add('hidden')
  document.getElementById('dashboard-view').classList.remove('hidden')
  loadAll()
}

// ---- 数据加载与渲染 ----
async function loadAll() {
  const q = `?from=${state.from}&to=${state.to}`
  const [overview, projects, sessions] = await Promise.all([
    api(`/api/admin/overview${q}`),
    api(`/api/admin/project-analytics${q}`),
    api(`/api/admin/sessions${q}&page=1`),
  ])
  renderOverview(overview)
  renderProjects(projects)
  renderSessions(sessions)
}

function renderOverview(d) {
  const cards = [
    ['页面浏览量', d.pageViews],
    ['独立访客', d.uniqueVisitors],
    ['访问会话', d.sessions],
    ['平均停留', fmtDuration(d.avgForegroundMs)],
    ['简历点击', d.resumeClicks],
    ['邮箱点击', d.contactClicks],
  ]
  document.getElementById('overview-cards').innerHTML = cards
    .map(([k, v]) => `<div class="card"><span>${k}</span><strong>${v}</strong></div>`)
    .join('')
  // PSEUDO: 用 d.dailyTrend 画折线图（Chart.js / 轻量 canvas 绘制）
  drawTrend(d.dailyTrend)
}

function renderProjects(rows) {
  const tbody = document.querySelector('#project-table tbody')
  tbody.innerHTML = (rows || [])
    .map(
      (r) => `<tr>
        <td>${r.projectName}</td><td>${r.pageViews}</td><td>${r.visitors}</td>
        <td>${fmtDuration(r.avgForegroundMs)}</td><td>${r.resumeClicks}</td>
      </tr>`,
    )
    .join('')
}

function renderSessions(data) {
  const tbody = document.querySelector('#session-table tbody')
  tbody.innerHTML = (data.items || [])
    .map(
      (s) => `<tr data-id="${s.sessionId}">
        <td>${new Date(s.startedAt).toLocaleString()}</td>
        <td>${s.ip || '—'}</td>
        <td>${s.referrerType === 'unknown' ? '直接访问或来源未知' : s.referrerType}</td>
        <td>${s.deviceType} / ${s.browser}</td>
        <td>${s.pageViewCount}</td>
        <td>${fmtDuration(s.totalForegroundMs)}</td>
        <td>${s.clickedResume ? '✓' : ''}</td>
        <td>${s.clickedContact ? '✓' : ''}</td>
      </tr>`,
    )
    .join('')
  // 点击行 -> 拉会话详情（页面浏览顺序 + 关键操作）
  tbody.querySelectorAll('tr').forEach((tr) => {
    tr.addEventListener('click', async () => {
      const detail = await api(`/api/admin/session?id=${tr.dataset.id}`)
      renderSessionDetail(detail)
    })
  })
}

function renderSessionDetail(detail) {
  const el = document.getElementById('session-detail')
  el.classList.remove('hidden')
  el.innerHTML = `<h3>会话 ${detail.sessionId}</h3>` +
    (detail.timeline || [])
      .map((t) => `<div>${new Date(t.createdAt).toLocaleTimeString()} · ${t.type} · ${t.pagePath || t.actionName || ''}</div>`)
      .join('')
}

// ---- 工具 ----
function fmtDuration(ms) {
  if (!ms) return '0s'
  const s = Math.round(ms / 1000)
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
}
function drawTrend(_trend) {
  // PSEUDO: 折线图渲染，X=日期 Y=浏览量/访客
}

// ---- 启动 ----
if (state.token) showDashboard()
else showLogin()
