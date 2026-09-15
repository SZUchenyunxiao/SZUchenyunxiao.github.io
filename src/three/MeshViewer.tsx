import { Canvas, useLoader } from '@react-three/fiber'
import { OrbitControls, Bounds, Center } from '@react-three/drei'
import { Suspense, useMemo } from 'react'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js'

interface Props {
  /** 相对 index.html 的模型路径，如 ./assets/models/mesh.glb */
  src: string
  /** 是否以线框方式显示（适合展示网格拓扑） */
  wireframe?: boolean
}

function resolveUrl(src: string) {
  const base = import.meta.env.BASE_URL ?? '/'
  return src.replace(/^\.\//, base)
}

function GltfModel({ url }: { url: string }) {
  const gltf = useLoader(GLTFLoader, url)
  return <primitive object={gltf.scene} />
}

function ObjModel({ url, wireframe }: { url: string; wireframe?: boolean }) {
  const obj = useLoader(OBJLoader, url)
  const object = useMemo(() => {
    const clone = obj.clone()
    if (wireframe) {
      clone.traverse((child) => {
        // @ts-expect-error material exists on meshes
        if (child.isMesh && child.material) {
          // @ts-expect-error runtime property
          child.material.wireframe = true
        }
      })
    }
    return clone
  }, [obj, wireframe])
  return <primitive object={object} />
}

function PlyMesh({ url, wireframe }: { url: string; wireframe?: boolean }) {
  const geometry = useLoader(PLYLoader, url)
  const geo = useMemo(() => {
    const g = geometry.clone()
    g.computeVertexNormals()
    return g
  }, [geometry])
  const hasColor = !!geo.getAttribute('color')
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial
        vertexColors={hasColor}
        color={hasColor ? '#ffffff' : '#b7bcc4'}
        roughness={0.6}
        metalness={0.05}
        wireframe={wireframe}
        flatShading
      />
    </mesh>
  )
}

function Model({ src, wireframe }: Props) {
  const url = useMemo(() => resolveUrl(src), [src])
  if (/\.obj$/i.test(src)) return <ObjModel url={url} wireframe={wireframe} />
  if (/\.ply$/i.test(src)) return <PlyMesh url={url} wireframe={wireframe} />
  return <GltfModel url={url} />
}

export function MeshViewer(props: Props) {
  return (
    <Canvas camera={{ position: [2.4, 1.8, 2.6], fov: 45 }} dpr={[1, 1.5]}>
      {/* 纯本地灯光，不依赖任何网络 HDR 环境贴图，保证离线/国内可用 */}
      <ambientLight intensity={0.9} />
      <hemisphereLight intensity={0.6} groundColor="#b7bcc4" />
      <directionalLight position={[4, 6, 5]} intensity={1.6} />
      <directionalLight position={[-4, 2, -3]} intensity={0.5} />
      <Suspense fallback={null}>
        <Bounds fit clip observe margin={1.1}>
          <Center>
            <Model {...props} />
          </Center>
        </Bounds>
      </Suspense>
      <OrbitControls enablePan={false} autoRotate autoRotateSpeed={0.5} makeDefault />
    </Canvas>
  )
}
