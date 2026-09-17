import { useEffect, useRef, useState } from 'react'
import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d'
import { useRenderVisibility } from '../hooks/useRenderVisibility'

interface Props {
  /** 相对 index.html 的模型路径，如 ./assets/models/scene.ply / .splat / .ksplat */
  src: string
}

/**
 * 真实 3D Gaussian Splatting 网页查看器。
 * 该库自带 Three.js 场景与渲染循环，因此不使用 React Three Fiber，
 * 直接挂到一个 div 容器上，并在卸载时彻底清理，避免内存泄漏。
 */
export function GaussianViewer({ src }: Props) {
  const { targetRef: containerRef, renderActive } = useRenderVisibility<HTMLDivElement>()
  const renderActiveRef = useRef(renderActive)
  renderActiveRef.current = renderActive
  const runtimeRef = useRef<{
    viewer: InstanceType<typeof GaussianSplats3D.Viewer>
    container: HTMLDivElement
    src: string
    loadSettled: boolean
    cancelled: boolean
    disposed: boolean
    disposeTimer: number | null
  } | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const disposeRuntime = (runtime: NonNullable<typeof runtimeRef.current>) => {
      if (runtime.disposed) return
      runtime.disposed = true

      // gaussian-splats-3d 0.4.7 always removes rootElement from document.body
      // during dispose(), even when the caller supplied an embedded root. Give
      // it a temporary body-owned root so teardown cannot remove React's div.
      const disposalRoot = document.createElement('div')
      disposalRoot.hidden = true
      document.body.appendChild(disposalRoot)

      const rendererElement = runtime.viewer.renderer?.domElement as HTMLElement | undefined
      if (rendererElement) disposalRoot.appendChild(rendererElement)
      runtime.viewer.rootElement = disposalRoot
      runtime.viewer.stop()

      try {
        void Promise.resolve(runtime.viewer.dispose())
          .catch(() => {
            /* A partially initialized third-party viewer may reject on teardown. */
          })
          .finally(() => disposalRoot.remove())
      } catch {
        disposalRoot.remove()
      }
      if (runtimeRef.current === runtime) runtimeRef.current = null
    }

    const scheduleDispose = (runtime: NonNullable<typeof runtimeRef.current>) => {
      runtime.disposeTimer = window.setTimeout(() => {
        runtime.disposeTimer = null
        runtime.cancelled = true
        if (runtime.loadSettled) disposeRuntime(runtime)
      }, 0)
    }

    // React StrictMode immediately runs effect cleanup and setup again in
    // development. Reuse the still-live viewer instead of destroying it while
    // addSplatScene() is in flight (the library is not StrictMode-safe there).
    const existingRuntime = runtimeRef.current
    if (
      existingRuntime &&
      !existingRuntime.cancelled &&
      existingRuntime.container === container &&
      existingRuntime.src === src
    ) {
      if (existingRuntime.disposeTimer !== null) {
        window.clearTimeout(existingRuntime.disposeTimer)
        existingRuntime.disposeTimer = null
      }
      return () => scheduleDispose(existingRuntime)
    }

    if (existingRuntime) {
      if (existingRuntime.disposeTimer !== null) {
        window.clearTimeout(existingRuntime.disposeTimer)
      }
      existingRuntime.cancelled = true
      if (existingRuntime.loadSettled) disposeRuntime(existingRuntime)
    }

    // 用 BASE_URL 处理 GitHub Pages 子路径部署的情况
    const base = import.meta.env.BASE_URL ?? '/'
    const url = src.replace(/^\.\//, base)

    const viewer = new GaussianSplats3D.Viewer({
      rootElement: container,
      cameraUp: [0, -1, 0],
      initialCameraPosition: [0, 0, 4],
      initialCameraLookAt: [0, 0, 0],
      sharedMemoryForWorkers: false, // 关闭以避免部署环境缺少 COOP/COEP 头时报错
      useBuiltInControls: true,
      dynamicScene: false,
    })

    const runtime = {
      viewer,
      container,
      src,
      loadSettled: false,
      cancelled: false,
      disposed: false,
      disposeTimer: null,
    }
    runtimeRef.current = runtime
    setStatus('loading')
    setProgress(0)

    viewer
      .addSplatScene(url, {
        showLoadingUI: false,
        progressiveLoad: true,
        onProgress: (percent: number) => {
          if (!runtime.cancelled) setProgress(Math.round(percent))
        },
      })
      .then(() => {
        runtime.loadSettled = true
        if (runtime.cancelled) {
          disposeRuntime(runtime)
          return
        }
        setStatus('ready')
        if (renderActiveRef.current) viewer.start()
      })
      .catch((err: unknown) => {
        runtime.loadSettled = true
        if (!runtime.cancelled) {
          console.error('[GaussianViewer] failed to load splat scene:', err)
          setStatus('error')
        }
        disposeRuntime(runtime)
      })

    return () => scheduleDispose(runtime)
  }, [src])

  useEffect(() => {
    const runtime = runtimeRef.current
    if (!runtime || !runtime.loadSettled || runtime.cancelled || runtime.disposed) return

    if (renderActive) runtime.viewer.start()
    else runtime.viewer.stop()
  }, [renderActive])

  return (
    <div className="gaussian-viewer">
      <div ref={containerRef} className="gaussian-viewer-canvas" />
      {status === 'loading' && (
        <div className="gaussian-viewer-overlay">
          <span>Loading 3DGS · {progress}%</span>
        </div>
      )}
      {status === 'error' && (
        <div className="gaussian-viewer-overlay gaussian-viewer-overlay--error">
          <span>模型加载失败，请检查文件路径与格式（.ply / .splat / .ksplat）</span>
        </div>
      )}
    </div>
  )
}
