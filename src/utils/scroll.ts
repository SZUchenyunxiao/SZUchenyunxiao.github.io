/**
 * 平滑滚动到页面内指定 id 的区块。
 * 用 JS 滚动而不是 <a href="#id">，因为项目使用 HashRouter，
 * 直接改 URL 的 hash 会被路由当成页面跳转，导致页面空白。
 */
export function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/** 生成一个阻止默认行为并平滑滚动的点击处理器 */
export function handleAnchorClick(id: string) {
  return (e: React.MouseEvent) => {
    e.preventDefault()
    scrollToId(id)
  }
}
