import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { DemoType } from '../types/project'

function PointCloud() {
  const ref = useRef<THREE.Points>(null)
  const positions = useMemo(() => {
    const count = 900
    const array = new Float32Array(count * 3)
    for (let i = 0; i < count; i += 1) {
      const t = i / count
      const angle = t * Math.PI * 14
      const radius = 0.5 + t * 1.1
      array[i * 3] = Math.cos(angle) * radius + (Math.random() - 0.5) * 0.18
      array[i * 3 + 1] = (t - 0.5) * 2.5 + (Math.random() - 0.5) * 0.18
      array[i * 3 + 2] = Math.sin(angle) * radius + (Math.random() - 0.5) * 0.18
    }
    return array
  }, [])

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.08
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#0071e3" size={0.032} sizeAttenuation />
    </points>
  )
}

function MeshObject() {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.12
  })
  return (
    <mesh ref={ref} rotation={[0.4, 0.2, 0.15]}>
      <torusKnotGeometry args={[0.85, 0.24, 120, 16]} />
      <meshStandardMaterial color="#5a6474" roughness={0.55} metalness={0.05} wireframe />
    </mesh>
  )
}

function GaussianCloud() {
  const group = useRef<THREE.Group>(null)
  const items = useMemo(
    () => Array.from({ length: 70 }, (_, i) => ({
      p: [
        Math.sin(i * 1.7) * (0.45 + (i % 9) * 0.08),
        ((i % 14) - 7) * 0.12,
        Math.cos(i * 1.23) * (0.45 + (i % 7) * 0.11),
      ] as [number, number, number],
      s: [0.06 + (i % 4) * 0.025, 0.03 + (i % 3) * 0.02, 0.08 + (i % 5) * 0.02] as [number, number, number],
    })),
    [],
  )
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.08
  })
  return (
    <group ref={group}>
      {items.map((item, index) => (
        <mesh key={index} position={item.p} scale={item.s} rotation={[index * 0.1, index * 0.07, 0]}>
          <sphereGeometry args={[1, 12, 8]} />
          <meshStandardMaterial color={index % 3 === 0 ? '#0071e3' : '#8e8e93'} transparent opacity={0.72} />
        </mesh>
      ))}
    </group>
  )
}

function Building() {
  return (
    <group rotation={[0.18, -0.45, 0]}>
      <mesh position={[0, -0.2, 0]}>
        <boxGeometry args={[1.65, 1.05, 1.2]} />
        <meshStandardMaterial color="#5a6474" wireframe />
      </mesh>
      <mesh position={[0, 0.55, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[1.15, 0.7, 4]} />
        <meshStandardMaterial color="#0071e3" wireframe />
      </mesh>
    </group>
  )
}

export function MiniScene({ variant }: { variant: DemoType }) {
  return (
    <Canvas camera={{ position: [2.8, 2.1, 3.2], fov: 42 }} dpr={[1, 1.5]}>
      <ambientLight intensity={1.4} />
      <directionalLight position={[3, 4, 5]} intensity={2.2} />
      {variant === 'mesh' && <MeshObject />}
      {variant === 'pointcloud' && <PointCloud />}
      {variant === 'gaussian' && <GaussianCloud />}
      {variant === 'building' && <Building />}
      <OrbitControls enablePan={false} minDistance={2.2} maxDistance={6} autoRotate autoRotateSpeed={0.35} />
    </Canvas>
  )
}
