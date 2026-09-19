import { useEffect, useState } from 'react'

const SCRIPT_SRC = 'https://events.vercount.one/js'
const LIVE_HOST = 'szucyx.github.io'
const CACHE_KEY = 'visitorCountData'

function readCachedCount(): string {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}') as { site_pv?: unknown }
    return typeof cached.site_pv === 'number' ? String(cached.site_pv) : '—'
  } catch {
    return '—'
  }
}

export function VisitCounter() {
  const [initialCount] = useState(readCachedCount)

  useEffect(() => {
    // Keep local development and preview refreshes out of the public counter.
    if (window.location.hostname !== LIVE_HOST) return
    if (document.querySelector(`script[src="${SCRIPT_SRC}"]`)) return

    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.defer = true
    script.dataset.visitCounter = 'true'
    document.head.appendChild(script)
  }, [])

  return (
    <span className="visit-counter" title="Total page visits">
      Visits <span id="vercount_value_site_pv">{initialCount}</span>
    </span>
  )
}
