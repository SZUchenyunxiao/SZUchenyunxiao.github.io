const IS_LOCAL_PREVIEW = ['127.0.0.1', 'localhost'].includes(location.hostname)
const LOCAL_PREVIEW_PASSWORD = globalThis.ANALYTICS_LOCAL_PASSWORD || ''
const LOCAL_PREVIEW_TOKEN = 'local-preview'

const state = {
  localToken: sessionStorage.getItem('an_admin_token') || '',
  from: Date.now() - 7 * 864e5,
  to: Date.now(),
  liveRangeDays: 7,
  isLoading: false,
  charts: {},
}

const CHART_COLORS = ['#0071e3', '#5ac8fa', '#34c759', '#ff9f0a', '#af52de', '#ff375f', '#64d2ff', '#8e8e93']
const SOURCE_LABELS = {
  direct: '直接访问',
  search: '搜索引擎',
  social: '社交平台',
  external: '外部链接',
  unknown: '未知来源',
}
const DEVICE_LABELS = {
  desktop: '桌面端',
  mobile: '移动端',
  tablet: '平板',
  unknown: '未知设备',
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
        breakdowns: { sources: [], devices: [], browsers: [], countries: [] },
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
    state.liveRangeDays = Number(button.dataset.range)
    setActiveRangeButton(button)
    loadAll()
  })
})

document.getElementById('apply-range')?.addEventListener('click', () => {
  const from = document.getElementById('from-date').value
  const to = document.getElementById('to-date').value
  if (from) state.from = new Date(from).getTime()
  if (to) state.to = new Date(to).getTime() + 864e5 - 1
  state.liveRangeDays = null
  setActiveRangeButton(null)
  loadAll()
})

document.getElementById('refresh-data')?.addEventListener('click', () => loadAll())

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
  if (state.isLoading) return
  if (state.liveRangeDays) {
    state.to = Date.now()
    state.from = state.to - state.liveRangeDays * 864e5
  }

  state.isLoading = true
  setRefreshState(true)
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
    document.getElementById('last-updated').textContent = `更新于 ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
  } catch (error) {
    if (error.status !== 401) console.error(error)
  } finally {
    state.isLoading = false
    setRefreshState(false)
  }
}

function setActiveRangeButton(activeButton) {
  document.querySelectorAll('[data-range]').forEach((button) => {
    button.classList.toggle('active', button === activeButton)
  })
}

function setRefreshState(isRefreshing) {
  const button = document.getElementById('refresh-data')
  if (!button) return
  button.disabled = isRefreshing
  button.textContent = isRefreshing ? '刷新中…' : '刷新'
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
  drawBreakdown('source-chart', data.breakdowns?.sources || [], SOURCE_LABELS)
  drawBreakdown('device-chart', data.breakdowns?.devices || [], DEVICE_LABELS)
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
  drawProjectChart(rows || [])
}

function renderSessions(data) {
  const tbody = document.querySelector('#session-table tbody')
  tbody.innerHTML = (data.items || [])
    .map(
      (session) => `<tr data-id="${escapeHtml(session.sessionId)}">
        <td>${escapeHtml(new Date(session.startedAt).toLocaleString())}</td>
        <td><code class="visitor-id" title="${escapeHtml(session.visitorId)}">${escapeHtml(shortVisitorId(session.visitorId))}</code></td>
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

function shortVisitorId(value) {
  return value ? `访客 ${String(value).slice(0, 8)}` : '—'
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
  drawChart(
    'trend-chart',
    {
      type: 'line',
      data: {
        labels: trend.map((item) => formatDay(item.day)),
        datasets: [
          {
            label: '页面浏览量',
            data: trend.map((item) => Number(item.pageViews) || 0),
            borderColor: '#0071e3',
            backgroundColor: 'rgba(0, 113, 227, .11)',
            fill: true,
            tension: 0.28,
            pointRadius: trend.length > 14 ? 0 : 3,
            pointHoverRadius: 5,
            borderWidth: 2,
          },
          {
            label: '独立访客',
            data: trend.map((item) => Number(item.visitors) || 0),
            borderColor: '#34c759',
            backgroundColor: 'transparent',
            tension: 0.28,
            pointRadius: trend.length > 14 ? 0 : 3,
            pointHoverRadius: 5,
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', align: 'end', labels: { usePointStyle: true, boxWidth: 8, boxHeight: 8 } },
          tooltip: { padding: 11, cornerRadius: 9 },
        },
        scales: {
          x: { grid: { display: false }, border: { display: false }, ticks: { maxRotation: 0, autoSkipPadding: 20 } },
          y: { beginAtZero: true, border: { display: false }, ticks: { precision: 0 }, grid: { color: '#ececf0' } },
        },
      },
    },
    trend.length > 0,
  )
}

function drawBreakdown(canvasId, rows, labelMap) {
  const normalizedRows = rows.filter((row) => Number(row.value) > 0)
  drawChart(
    canvasId,
    {
      type: 'doughnut',
      data: {
        labels: normalizedRows.map((row) => labelMap[row.label] || row.label),
        datasets: [{
          data: normalizedRows.map((row) => Number(row.value)),
          backgroundColor: CHART_COLORS,
          borderWidth: 0,
          hoverOffset: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { usePointStyle: true, boxWidth: 8, boxHeight: 8, padding: 16 },
          },
          tooltip: {
            padding: 11,
            cornerRadius: 9,
            callbacks: {
              label(context) {
                const total = context.dataset.data.reduce((sum, value) => sum + Number(value), 0)
                const percent = total ? Math.round((Number(context.raw) / total) * 100) : 0
                return ` ${context.label}: ${context.raw} (${percent}%)`
              },
            },
          },
        },
      },
    },
    normalizedRows.length > 0,
  )
}

function drawProjectChart(rows) {
  const normalizedRows = rows.filter((row) => Number(row.pageViews) > 0 || Number(row.visitors) > 0)
  drawChart(
    'project-chart',
    {
      type: 'bar',
      data: {
        labels: normalizedRows.map((row) => row.projectName),
        datasets: [
          { label: '页面浏览量', data: normalizedRows.map((row) => Number(row.pageViews)), backgroundColor: '#0071e3', borderRadius: 5 },
          { label: '独立访客', data: normalizedRows.map((row) => Number(row.visitors)), backgroundColor: '#8fd3ff', borderRadius: 5 },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', align: 'end', labels: { usePointStyle: true, boxWidth: 8, boxHeight: 8 } },
          tooltip: { padding: 11, cornerRadius: 9 },
        },
        scales: {
          x: { beginAtZero: true, border: { display: false }, ticks: { precision: 0 }, grid: { color: '#ececf0' } },
          y: { grid: { display: false }, border: { display: false } },
        },
      },
    },
    normalizedRows.length > 0,
  )
}

function drawChart(canvasId, config, hasData) {
  const canvas = document.getElementById(canvasId)
  const empty = canvas?.parentElement?.querySelector('.chart-empty')
  state.charts[canvasId]?.destroy()
  delete state.charts[canvasId]

  if (!canvas || !globalThis.Chart || !hasData) {
    canvas?.classList.add('hidden')
    empty?.classList.remove('hidden')
    if (!globalThis.Chart && empty) empty.textContent = '图表组件加载失败'
    return
  }

  canvas.classList.remove('hidden')
  empty?.classList.add('hidden')
  globalThis.Chart.defaults.font.family = getComputedStyle(document.body).fontFamily
  globalThis.Chart.defaults.color = '#6e6e73'
  globalThis.Chart.defaults.animation.duration = 300
  state.charts[canvasId] = new globalThis.Chart(canvas, config)
}

function formatDay(day) {
  const parts = String(day).split('-')
  return parts.length === 3 ? `${parts[1]}/${parts[2]}` : day
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

setInterval(() => {
  const dashboardVisible = !document.getElementById('dashboard-view').classList.contains('hidden')
  if (dashboardVisible && !document.hidden) loadAll()
}, 30_000)

document.addEventListener('visibilitychange', () => {
  const dashboardVisible = !document.getElementById('dashboard-view').classList.contains('hidden')
  if (!document.hidden && dashboardVisible) loadAll()
})
