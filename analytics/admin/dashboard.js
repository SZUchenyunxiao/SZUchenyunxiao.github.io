const IS_LOCAL_PREVIEW = ['127.0.0.1', 'localhost'].includes(location.hostname)
const LOCAL_PREVIEW_PASSWORD = globalThis.ANALYTICS_LOCAL_PASSWORD || ''
const LOCAL_PREVIEW_TOKEN = 'local-preview'

const state = {
  localToken: sessionStorage.getItem('an_admin_token') || '',
  from: Date.now() - 7 * 864e5,
  to: Date.now(),
}

async function api(path, options = {}) {
  if (IS_LOCAL_PREVIEW && state.localToken === LOCAL_PREVIEW_TOKEN) {
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
    if (path === '/api/admin/logout') return { ok: true }
  }

  const response = await fetch(path, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  const data = await response.json().catch(() => ({ error: 'invalid response' }))
  if (!response.ok) {
    const error = new Error(data.error || `Request failed (${response.status})`)
    error.status = response.status
    if (response.status === 401) showLogin()
    throw error
  }
  return data
}

document.getElementById('login-form').addEventListener('submit', async (event) => {
  event.preventDefault()
  const password = document.getElementById('password').value
  const error = document.getElementById('login-error')
  error.textContent = ''

  if (IS_LOCAL_PREVIEW && LOCAL_PREVIEW_PASSWORD) {
    if (password !== LOCAL_PREVIEW_PASSWORD) {
      error.textContent = 'Incorrect password'
      return
    }
    state.localToken = LOCAL_PREVIEW_TOKEN
    sessionStorage.setItem('an_admin_token', state.localToken)
    showDashboard()
    return
  }

  try {
    await api('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    })
    document.getElementById('password').value = ''
    showDashboard()
  } catch (requestError) {
    error.textContent = requestError.status === 429
      ? 'Too many attempts. Try again later.'
      : 'Incorrect password'
  }
})

document.getElementById('logout')?.addEventListener('click', async () => {
  try {
    await api('/api/admin/logout', { method: 'POST' })
  } catch {
    // The local UI should still return to the login screen.
  }
  state.localToken = ''
  sessionStorage.removeItem('an_admin_token')
  showLogin()
})

document.querySelectorAll('[data-range]').forEach((button) => {
  button.addEventListener('click', () => {
    state.from = Date.now() - Number(button.dataset.range) * 864e5
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

function showLogin() {
  document.getElementById('login-view').classList.remove('hidden')
  document.getElementById('dashboard-view').classList.add('hidden')
}

function showDashboard() {
  document.getElementById('login-view').classList.add('hidden')
  document.getElementById('dashboard-view').classList.remove('hidden')
  loadAll()
}

async function loadAll() {
  const query = `?from=${state.from}&to=${state.to}`
  try {
    const [overview, projects, sessions] = await Promise.all([
      api(`/api/admin/overview${query}`),
      api(`/api/admin/project-analytics${query}`),
      api(`/api/admin/sessions${query}&page=1`),
    ])
    renderOverview(overview)
    renderProjects(projects)
    renderSessions(sessions)
  } catch (error) {
    if (error.status !== 401) console.error(error)
  }
}

function renderOverview(data) {
  const cards = [
    ['页面浏览量', data.pageViews],
    ['独立访客', data.uniqueVisitors],
    ['访问会话', data.sessions],
    ['平均停留', fmtDuration(data.avgForegroundMs)],
    ['简历点击', data.resumeClicks],
    ['邮箱点击', data.contactClicks],
  ]
  document.getElementById('overview-cards').innerHTML = cards
    .map(([label, value]) => `<div class="card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`)
    .join('')
  drawTrend(data.dailyTrend || [])
}

function renderProjects(rows) {
  const tbody = document.querySelector('#project-table tbody')
  tbody.innerHTML = (rows || [])
    .map(
      (row) => `<tr>
        <td>${escapeHtml(row.projectName)}</td><td>${escapeHtml(row.pageViews)}</td><td>${escapeHtml(row.visitors)}</td>
        <td>${escapeHtml(fmtDuration(row.avgForegroundMs))}</td><td>${escapeHtml(row.resumeClicks)}</td>
      </tr>`,
    )
    .join('')
}

function renderSessions(data) {
  const tbody = document.querySelector('#session-table tbody')
  tbody.innerHTML = (data.items || [])
    .map(
      (session) => `<tr data-id="${escapeHtml(session.sessionId)}">
        <td>${escapeHtml(new Date(session.startedAt).toLocaleString())}</td>
        <td>${escapeHtml(session.ip || '—')}</td>
        <td>${escapeHtml(session.country || '—')}</td>
        <td>${escapeHtml(session.referrerType === 'unknown' ? '直接访问或来源未知' : session.referrerType)}</td>
        <td>${escapeHtml(`${session.deviceType} / ${session.browser} / ${session.os}`)}</td>
        <td>${escapeHtml(session.pageViewCount)}</td>
        <td>${escapeHtml(fmtDuration(session.totalForegroundMs))}</td>
        <td>${session.clickedResume ? '✓' : ''}</td>
        <td>${session.clickedContact ? '✓' : ''}</td>
      </tr>`,
    )
    .join('')

  tbody.querySelectorAll('tr').forEach((row) => {
    row.addEventListener('click', async () => {
      try {
        renderSessionDetail(await api(`/api/admin/session?id=${encodeURIComponent(row.dataset.id)}`))
      } catch (error) {
        if (error.status !== 401) console.error(error)
      }
    })
  })
}

function renderSessionDetail(detail) {
  const element = document.getElementById('session-detail')
  element.classList.remove('hidden')
  element.innerHTML = `<h3>会话 ${escapeHtml(detail.sessionId)}</h3>` +
    (detail.timeline || [])
      .map((item) => {
        const description = item.pagePath || item.actionName || (item.foregroundMs ? fmtDuration(item.foregroundMs) : '')
        return `<div>${escapeHtml(new Date(item.createdAt).toLocaleTimeString())} · ${escapeHtml(item.type)} · ${escapeHtml(description)}</div>`
      })
      .join('')
}

function fmtDuration(ms) {
  if (!ms) return '0s'
  const seconds = Math.round(ms / 1000)
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

function drawTrend(trend) {
  const canvas = document.getElementById('trend-chart')
  const ratio = window.devicePixelRatio || 1
  const width = Math.max(canvas.clientWidth || 600, 320)
  const height = Math.max(canvas.clientHeight || 220, 180)
  canvas.width = width * ratio
  canvas.height = height * ratio
  const context = canvas.getContext('2d')
  context.scale(ratio, ratio)
  context.clearRect(0, 0, width, height)

  if (!trend.length) {
    context.fillStyle = '#8a8a8a'
    context.font = '14px system-ui'
    context.fillText('暂无趋势数据', 24, 36)
    return
  }

  const padding = 30
  const max = Math.max(1, ...trend.map((item) => Number(item.pageViews) || 0))
  context.strokeStyle = '#1f1f1f'
  context.lineWidth = 2
  context.beginPath()
  trend.forEach((item, index) => {
    const x = padding + (index / Math.max(1, trend.length - 1)) * (width - padding * 2)
    const y = height - padding - (Number(item.pageViews) / max) * (height - padding * 2)
    if (index === 0) context.moveTo(x, y)
    else context.lineTo(x, y)
  })
  context.stroke()
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

if (IS_LOCAL_PREVIEW) {
  if (state.localToken === LOCAL_PREVIEW_TOKEN) showDashboard()
  else showLogin()
} else {
  showDashboard()
}
