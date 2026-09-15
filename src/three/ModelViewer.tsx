import { Suspense, lazy } from 'react'
import type { DemoType } from '../types/project'

// 三种查看器都体积较大，全部懒加载，只有真正用到时才拉取。
const GaussianViewer = lazy(() =>
  import('./GaussianViewer').then((m) => ({ default: m.GaussianViewer })),
)
const PointCloudViewer = lazy(() =>
  import('./PointCloudViewer').then((m) => ({ default: m.PointCloudViewer })),
)
const MeshViewer = lazy(() =>
  import('./MeshViewer').then((m) => ({ default: m.MeshViewer })),
)

interface Props {
  demoType: DemoType
  /** 真实模型路径；决定用哪个查看器由 demoType 决定 */
  src: string
}

/**
 * 按 demoType 分发到对应的真实数据查看器：
 * - gaussian            → GaussianViewer（.ply / .splat / .ksplat）
 * - pointcloud          → PointCloudViewer（.ply 点云）
 * - mesh / building     → MeshViewer（.glb / .gltf / .obj）
 */
export function ModelViewer({ demoType, src }: Props) {
  const fallback = (
    <div className="gaussian-viewer-overlay">
      <span>Loading model…</span>
    </div>
  )

  return (
    <Suspense fallback={fallback}>
      {demoType === 'gaussian' && <GaussianViewer src={src} />}
      {demoType === 'pointcloud' && <PointCloudViewer src={src} />}
      {(demoType === 'mesh' || demoType === 'building') && (
        <MeshViewer src={src} wireframe={demoType === 'building'} />
      )}
    </Suspense>
  )
}
