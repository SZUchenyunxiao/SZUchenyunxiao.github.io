// 出口 IP 获取、IP 脱敏、来源分类、User-Agent 解析

// Cloudflare 会在请求头带上真实客户端 IP
export function getClientIP(request: Request): string {
  return (
    request.headers.get('CF-Connecting-IP') ??
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ??
    'unknown'
  )
}

// 脱敏前缀：IPv4 保留 /24，IPv6 保留 /48，用于长期不含完整 IP 的汇总
export function ipPrefix(ip: string): string {
  if (ip.includes(':')) {
    // IPv6
    return ip.split(':').slice(0, 3).join(':') + '::/48'
  }
  const parts = ip.split('.')
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`
  return 'unknown'
}

// 来源分类：direct / search / social / external / unknown
export function classifyReferrer(referrer: string | undefined, ownOrigin: string): string {
  if (!referrer) return 'direct'
  try {
    const host = new URL(referrer).hostname
    if (ownOrigin.includes(host)) return 'direct' // 站内跳转
    if (/google|bing|baidu|duckduckgo|sogou/.test(host)) return 'search'
    if (/github|linkedin|twitter|x\.com|zhihu|weibo|t\.co/.test(host)) return 'social'
    return 'external'
  } catch {
    return 'unknown'
  }
}

// 极简 UA 解析（落地可换成成熟库；Worker 环境偏向轻量手写）
export function parseUserAgent(ua: string): { device: string; browser: string; os: string } {
  const device = /Mobile|Android|iPhone/.test(ua)
    ? 'mobile'
    : /iPad|Tablet/.test(ua)
      ? 'tablet'
      : 'desktop'
  const browser = /Edg/.test(ua)
    ? 'Edge'
    : /Chrome/.test(ua)
      ? 'Chrome'
      : /Firefox/.test(ua)
        ? 'Firefox'
        : /Safari/.test(ua)
          ? 'Safari'
          : 'Other'
  const os = /Windows/.test(ua)
    ? 'Windows'
    : /Mac OS/.test(ua)
      ? 'macOS'
      : /Android/.test(ua)
        ? 'Android'
        : /iPhone|iPad|iOS/.test(ua)
          ? 'iOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : 'Other'
  return { device, browser, os }
}
