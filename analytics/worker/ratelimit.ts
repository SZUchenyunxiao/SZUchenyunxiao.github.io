// 限流 + 重复事件过滤，减少异常/恶意请求影响。
// 简单实现可用 D1 计数；更好的方案用 Cloudflare KV 或 Durable Objects 做滑动窗口。

import type { Env } from './types'

const WINDOW_MS = 60 * 1000
const MAX_PER_WINDOW = 120 // 单 IP 每分钟最多写入次数（按需调整）

export async function checkRateLimit(_env: Env, _ip: string): Promise<boolean> {
  // PSEUDO（KV 版）：
  //   key = `rl:${ip}:${floor(now/WINDOW_MS)}`
  //   n = await KV.get(key) ?? 0
  //   if n >= MAX_PER_WINDOW: return false
  //   await KV.put(key, n+1, { expirationTtl: 60 })
  //   return true
  void WINDOW_MS
  void MAX_PER_WINDOW
  return true
}

export async function isDuplicate(_env: Env, _dedupKey: string): Promise<boolean> {
  // 幂等：dedup_key 建了唯一索引，写入冲突即视为重复。
  // 也可先查 KV 短期缓存加速：
  //   if await KV.get(`dedup:${dedupKey}`): return true
  //   await KV.put(`dedup:${dedupKey}`, '1', { expirationTtl: 3600 })
  return false
}
