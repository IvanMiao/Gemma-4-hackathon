import { ContactShadows, OrbitControls, RoundedBox } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { DiagnosticPhase } from '../../types/domain'

interface CabinetSceneProps {
  phase: DiagnosticPhase
}

function toneColor(phase: DiagnosticPhase): string {
  if (phase === 'resolved') return '#53d8ce'
  if (phase === 'error') return '#ff684e'
  if (phase === 'analyzing' || phase === 'decision-ready') return '#efb44f'
  return '#8f7cff'
}

function RelayLed({ position, phase, offset }: { position: [number, number, number]; phase: DiagnosticPhase; offset: number }) {
  const ref = useRef<THREE.Mesh>(null)
  const color = toneColor(phase)
  const isBusy = phase === 'analyzing' || phase === 'decision-ready'

  useFrame(({ clock }) => {
    const mat = ref.current?.material as THREE.MeshStandardMaterial | undefined
    if (!mat) return
    if (phase === 'resolved') {
      mat.emissiveIntensity = 1.1
      return
    }
    const speed = isBusy ? 6 : 1.4
    const pulse = 0.5 + Math.sin(clock.elapsedTime * speed + offset) * 0.45
    mat.emissiveIntensity = isBusy ? 0.6 + pulse * 1.2 : 0.35 + pulse * 0.3
  })

  return (
    <mesh ref={ref} position={position}>
      <boxGeometry args={[0.09, 0.09, 0.02]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
    </mesh>
  )
}

function HazePlane({ phase }: { phase: DiagnosticPhase }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    const mat = ref.current?.material as THREE.MeshBasicMaterial | undefined
    if (!mat) return
    const base = phase === 'analyzing' ? 0.16 : 0.05
    mat.opacity = base + Math.sin(clock.elapsedTime * 0.8) * 0.03
    if (ref.current) ref.current.position.y = 1.7 + Math.sin(clock.elapsedTime * 0.5) * 0.08
  })
  return (
    <mesh ref={ref} position={[0, 1.7, 0.3]} rotation={[-Math.PI / 2.4, 0, 0]}>
      <planeGeometry args={[1.6, 1.2]} />
      <meshBasicMaterial color="#c7d0cd" transparent opacity={0.08} depthWrite={false} />
    </mesh>
  )
}

function Cabinet({ phase }: { phase: DiagnosticPhase }) {
  const doorRef = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)
  const color = toneColor(phase)

  useFrame((_, delta) => {
    if (!doorRef.current) return
    const target = phase === 'analyzing' || phase === 'decision-ready' ? -0.35 : hovered ? -0.15 : -0.04
    doorRef.current.rotation.y = THREE.MathUtils.damp(doorRef.current.rotation.y, target, 4, delta)
  })

  const leds = useMemo(() => {
    const rows = 3
    const cols = 5
    const out: { pos: [number, number, number]; offset: number }[] = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        out.push({ pos: [-0.42 + c * 0.21, 1.05 - r * 0.22, 0.171], offset: r * 1.3 + c * 0.6 })
      }
    }
    return out
  }, [])

  return (
    <group onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
      <RoundedBox args={[1.3, 1.9, 0.5]} radius={0.04} smoothness={3} position={[0, 0.95, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#20282a" metalness={0.55} roughness={0.5} />
      </RoundedBox>
      <group ref={doorRef} position={[-0.63, 0.95, 0.25]}>
        <RoundedBox args={[1.24, 1.7, 0.05]} radius={0.02} smoothness={2} position={[0.62, 0, 0]} castShadow>
          <meshStandardMaterial color="#2c3638" metalness={0.6} roughness={0.4} />
        </RoundedBox>
        {leds.map((led, i) => (
          <RelayLed key={i} position={[led.pos[0] + 0.63, led.pos[1] - 0.95, led.pos[2] + 0.87]} phase={phase} offset={led.offset} />
        ))}
      </group>
      <mesh position={[0, 1.98, 0]} castShadow>
        <boxGeometry args={[1.34, 0.06, 0.54]} />
        <meshStandardMaterial color="#171d1e" metalness={0.7} roughness={0.35} />
      </mesh>
      <mesh position={[0, 2.14, 0]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={hovered ? 1.6 : 1.1} />
      </mesh>
      <pointLight color={color} intensity={1.1} position={[0, 2.2, 0.4]} distance={3} />
      <HazePlane phase={phase} />
    </group>
  )
}

function Scene({ phase }: { phase: DiagnosticPhase }) {
  return (
    <>
      <fog attach="fog" args={['#0a0d0e', 6, 14]} />
      <ambientLight intensity={0.65} />
      <directionalLight castShadow color="#e8f2ef" intensity={1.8} position={[-3, 6, 3]} shadow-mapSize={[1024, 1024]} />
      <Cabinet phase={phase} />
      <gridHelper args={[16, 32, '#2a2f3a', '#161a20']} position={[0, -0.02, 0]} />
      <ContactShadows position={[0, -0.01, 0]} opacity={0.5} scale={10} blur={2.2} far={4} />
      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={3.6}
        maxDistance={6.5}
        minPolarAngle={0.5}
        maxPolarAngle={1.4}
        target={[0, 1, 0]}
        autoRotate={phase === 'idle'}
        autoRotateSpeed={0.4}
      />
    </>
  )
}

export default function CabinetScene({ phase }: CabinetSceneProps) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ position: [3.2, 2, 4], fov: 40 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      style={{ position: 'absolute', inset: 0 }}
      aria-label="3D status view of a signal relay cabinet"
    >
      <Scene phase={phase} />
    </Canvas>
  )
}
