import { useEffect, useRef, useState } from 'react'

/**
 * Only keep an expensive render loop alive while its host is on screen and
 * the browser tab is visible. The scene stays mounted, so resuming does not
 * reload models or discard the user's camera position.
 */
export function useRenderVisibility<T extends HTMLElement>() {
  const targetRef = useRef<T>(null)
  const [inViewport, setInViewport] = useState(false)
  const [pageVisible, setPageVisible] = useState(() => !document.hidden)

  useEffect(() => {
    const target = targetRef.current
    if (!target) return

    if (!('IntersectionObserver' in window)) {
      setInViewport(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => setInViewport(entry.isIntersecting),
      { threshold: 0.01 },
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const updatePageVisibility = () => setPageVisible(!document.hidden)
    document.addEventListener('visibilitychange', updatePageVisibility)
    return () => document.removeEventListener('visibilitychange', updatePageVisibility)
  }, [])

  return { targetRef, renderActive: inViewport && pageVisible }
}
