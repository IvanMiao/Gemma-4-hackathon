import { ContactShadows, OrbitControls } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import type { DiagnosticPhase } from '../../types/domain'

interface CrossingSceneProps {
  phase: DiagnosticPhase
}

function toneColor(phase: DiagnosticPhase): string {
  if (phase === 'resolved') return '#53d8ce'
  if (phase === 'error') return '#ff684e'
  if (phase === 'analyzing' || phase === 'decision-ready') return '#efb44f'
  return '#ff684e'
}

function Rail({ position, rotation = 0, length }: { position: [number, number, number]; rotation?: number; length: number }) {
  return (
    <mesh position={position} rotation={[0, rotation, 0]} castShadow receiveShadow>
      <boxGeometry args={[0.12, 0.12, length]} />
      <meshStandardMaterial color="#a7b2b4" emissive="#111719" emissiveIntensity={0.12} metalness={0.86} roughness={0.24} />
    </mesh>
  )
}

const sleepers = Array.from({ length: 13 }, (_, i) => -4.5 + i * 0.75)

function BarrierArm({ phase }: { phase: DiagnosticPhase }) {
  const armRef = useRef<THREE.Group>(null)
  const down = phase === 'analyzing' || phase === 'decision-ready'

  useFrame((_, delta) => {
    if (!armRef.current) return
    const target = down ? -Math.PI / 2.1 : 0
    armRef.current.rotation.z = THREE.MathUtils.damp(armRef.current.rotation.z, target, 3.2, delta)
  })

  return (
    <group position={[-1.7, 0, -1.9]}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 1.1, 12]} />
        <meshStandardMaterial color="#2c3638" metalness={0.6} roughness={0.4} />
      </mesh>
      <group ref={armRef} position={[0, 1.08, 0]}>
        <mesh position={[0.9, 0, 0]} castShadow>
          <boxGeometry args={[1.8, 0.06, 0.08]} />
          <meshStandardMaterial color="#e2b23a" emissive="#3a2a05" emissiveIntensity={0.3} />
        </mesh>
        {[0.3, 0.9, 1.5].map((x) => (
          <mesh key={x} position={[x, 0, 0.045]}>
            <boxGeometry args={[0.16, 0.08, 0.01]} />
            <meshStandardMaterial color="#c73b2f" />
          </mesh>
        ))}
      </group>
    </group>
  )
}

function SensorPillar({ phase }: { phase: DiagnosticPhase }) {
  const lightRef = useRef<THREE.PointLight>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const color = toneColor(phase)
  const busy = phase === 'analyzing' || phase === 'decision-ready'

  useFrame(({ clock }) => {
    const pulse = 0.7 + Math.sin(clock.elapsedTime * (busy ? 4.5 : 1.6)) * 0.25
    if (lightRef.current) lightRef.current.intensity = 1.2 + pulse
    if (ringRef.current) {
      ringRef.current.scale.setScalar(0.9 + pulse * 0.18)
      ;(ringRef.current.material as THREE.Material & { opacity: number }).opacity = 0.55 - pulse * 0.25
    }
  })

  return (
    <group position={[1.4, 0, 0.4]}>
      <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.09, 0.11, 0.7, 16]} />
        <meshStandardMaterial color="#303a3c" metalness={0.65} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.76, 0]} castShadow>
        <sphereGeometry args={[0.09, 20, 20]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} />
      </mesh>
      <mesh ref={ringRef} position={[0, 0.76, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.22, 0.012, 12, 42]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} />
      </mesh>
      <pointLight ref={lightRef} color={color} intensity={1.2} distance={3} position={[0, 0.76, 0]} />
    </group>
  )
}

function Scene({ phase }: { phase: DiagnosticPhase }) {
  return (
    <>
      <fog attach="fog" args={['#0a0d0e', 8, 16]} />
      <ambientLight intensity={0.7} />
      <directionalLight castShadow color="#e8f2ef" intensity={2} position={[-4, 7, 4]} shadow-mapSize={[1024, 1024]} />
      {sleepers.map((z) => (
        <mesh key={z} position={[0, -0.06, z]} receiveShadow castShadow>
          <boxGeometry args={[2.9, 0.13, 0.22]} />
          <meshStandardMaterial color="#322e29" roughness={0.9} />
        </mesh>
      ))}
      <Rail position={[-0.68, 0.08, 0]} length={9.8} />
      <Rail position={[0.68, 0.08, 0]} length={9.8} />
      <BarrierArm phase={phase} />
      <SensorPillar phase={phase} />
      <gridHelper args={[20, 40, '#28413f', '#162423']} position={[0, -0.13, 0]} />
      <ContactShadows position={[0, -0.12, 0]} opacity={0.5} scale={11} blur={2.3} far={4.5} />
      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={5.5}
        maxDistance={9.5}
        minPolarAngle={0.65}
        maxPolarAngle={1.32}
        target={[0.2, 0.3, 0]}
        autoRotate={phase === 'idle'}
        autoRotateSpeed={0.35}
      />
    </>
  )
}

export default function CrossingScene({ phase }: CrossingSceneProps) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ position: [5.6, 4, 6.4], fov: 38 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      style={{ position: 'absolute', inset: 0 }}
      aria-label="3D status view of a track sensor and crossing barrier"
    >
      <Scene phase={phase} />
    </Canvas>
  )
}
