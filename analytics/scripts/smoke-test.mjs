import { randomUUID } from 'node:crypto'

const [baseUrl = 'http://127.0.0.1:8787', password, siteOrigin = 'https://szuchenyunxiao.github.io'] = process.argv.slice(2)
if (!password) {
  console.error('Usage: node scripts/smoke-test.mjs <worker-url> <password> [site-origin]')
  process.exit(1)
}

const adminPage = await fetch(baseUrl)
assert(adminPage.ok, `admin asset returned ${adminPage.status}`)

const login = await fetch(`${baseUrl}/api/admin/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ password }),
})
if (!login.ok) throw new Error(`login returned ${login.status}: ${await login.text()}`)
const cookie = login.headers.get('set-cookie')?.split(';', 1)[0]
assert(cookie, 'login did not return a session cookie')

const visitorId = randomUUID()
const sessionId = randomUUID()
const collect = await fetch(`${baseUrl}/api/collect`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Origin: siteOrigin,
    'User-Agent': 'Portfolio smoke test',
  },
  body: JSON.stringify({
    visitorId,
    sessionId,
    dedupKey: randomUUID(),
    type: 'page_view',
    pagePath: '/projects/structured-light-scanning',
    projectSlug: 'structured-light-scanning',
    ts: Date.now(),
  }),
})
if (!collect.ok) throw new Error(`collect returned ${collect.status}: ${await collect.text()}`)

const now = Date.now()
const overview = await fetch(
  `${baseUrl}/api/admin/overview?from=${now - 864e5}&to=${now + 1000}`,
  { headers: { Cookie: cookie } },
)
if (!overview.ok) throw new Error(`overview returned ${overview.status}: ${await overview.text()}`)
const metrics = await overview.json()
assert(metrics.pageViews >= 1, 'overview did not include the test page view')

const projectsResponse = await fetch(
  `${baseUrl}/api/admin/project-analytics?from=${now - 864e5}&to=${now + 1000}`,
  { headers: { Cookie: cookie } },
)
if (!projectsResponse.ok) throw new Error(`project analytics returned ${projectsResponse.status}`)
const projects = await projectsResponse.json()
assert(
  projects.some((project) => project.projectSlug === 'structured-light-scanning'),
  'project analytics did not include the test project',
)

const sessionsResponse = await fetch(
  `${baseUrl}/api/admin/sessions?from=${now - 864e5}&to=${now + 1000}&page=1`,
  { headers: { Cookie: cookie } },
)
if (!sessionsResponse.ok) throw new Error(`sessions returned ${sessionsResponse.status}`)
const sessions = await sessionsResponse.json()
assert(sessions.items.some((session) => session.sessionId === sessionId), 'session list missed the test session')

console.log(JSON.stringify({
  ok: true,
  pageViews: metrics.pageViews,
  uniqueVisitors: metrics.uniqueVisitors,
  projects: projects.length,
  sessions: sessions.total,
  visitorId,
  sessionId,
}))

function assert(condition, message) {
  if (!condition) throw new Error(message)
}
