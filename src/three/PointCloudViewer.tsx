import { Canvas, useLoader } from '@react-three/fiber'
import { OrbitControls, Bounds } from '@react-three/drei'
import { Suspense, useMemo } from 'react'
import * as THREE from 'three'
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js'
import { useRenderVisibility } from '../hooks/useRenderVisibility'

interface Props {
  /** 相对 index.html 的点云路径，如 ./assets/models/scan.ply */
  src: string
  /** 未提供顶点颜色时使用的点颜色 */
  color?: string
  /** 点大小系数（相对归一化后的模型尺度，1 为默认）。留空自动。 */
  pointSize?: number
  /** 是否绕 X 轴翻转 180°（很多扫描数据 Y 轴朝下，需要翻正）。默认 true。 */
  flipY?: boolean
}

function resolveUrl(src: string) {
  const base = import.meta.env.BASE_URL ?? '/'
  return src.replace(/^\.\//, base)
}

function PointCloud({ src, color = '#0071e3', pointSize = 1, flipY = true }: Props) {
  const url = useMemo(() => resolveUrl(src), [src])
  const geometry = useLoader(PLYLoader, url)

  // 居中 + 归一化到约 2 个单位大小，任何坐标尺度的点云都能稳定显示，
  // 点大小按模型尺度和点数量自动推导，再乘以用户系数。
  const { centered, size } = useMemo(() => {
    const geo = geometry.clone()
    // 很多扫描数据 Y 轴朝下，绕 X 轴翻转 180° 翻正
    if (flipY) geo.rotateX(Math.PI)
    geo.computeBoundingBox()
    let scale = 1
    if (geo.boundingBox) {
      const center = new THREE.Vector3()
      geo.boundingBox.getCenter(center)
      geo.translate(-center.x, -center.y, -center.z)
      const dim = new THREE.Vector3()
      geo.boundingBox.getSize(dim)
      const maxDim = Math.max(dim.x, dim.y, dim.z) || 1
      scale = 2 / maxDim
      geo.scale(scale, scale, scale)
    }
    const count = geo.getAttribute('position')?.count ?? 1
    // 点越多，单点越小；基准值按归一化后的单位尺度
    const auto = Math.max(0.006, Math.min(0.03, 40 / Math.sqrt(count)))
    return { centered: geo, size: auto * pointSize }
  }, [geometry, pointSize, flipY])

  const hasColor = !!centered.getAttribute('color')

  return (
    <points geometry={centered}>
      <pointsMaterial
        size={size}
        sizeAttenuation
        vertexColors={hasColor}
        color={hasColor ? '#ffffff' : color}
      />
    </points>
  )
}

export function PointCloudViewer(props: Props) {
  const { targetRef, renderActive } = useRenderVisibility<HTMLDivElement>()

  return (
    <div ref={targetRef} className="render-viewport">
      <Canvas
        camera={{ position: [1.8, 1.4, 2.2], fov: 45 }}
        dpr={[1, 1.5]}
        frameloop={renderActive ? 'always' : 'never'}
      >
        <Suspense fallback={null}>
          <Bounds fit clip observe margin={1.2}>
            <PointCloud {...props} />
          </Bounds>
        </Suspense>
        <OrbitControls enablePan={false} autoRotate autoRotateSpeed={0.4} makeDefault />
      </Canvas>
    </div>
  )
}
