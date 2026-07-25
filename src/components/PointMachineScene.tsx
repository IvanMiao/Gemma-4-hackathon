import { ContactShadows, OrbitControls, RoundedBox, useCursor } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import type { ComponentRef, RefObject } from 'react'
import * as THREE from 'three'
import type { TwinPartId } from '../features/digitalTwin/model'
import type { DiagnosticPhase } from '../types/domain'

interface SceneProps {
  phase: DiagnosticPhase
  selectedPart: TwinPartId | null
  onSelectPart: (part: TwinPartId | null) => void
}

const sleepers = Array.from({ length: 15 }, (_, index) => -5.25 + index * 0.75)

function RailSegment({
  position,
  rotation = 0,
  length,
  active = false,
  selected = false,
}: {
  position: [number, number, number]
  rotation?: number
  length: number
  active?: boolean
  selected?: boolean
}) {
  const color = selected ? '#73eee4' : active ? '#efb44f' : '#a7b2b4'
  const emissive = selected ? '#167d76' : active ? '#8b4a0d' : '#111719'

  return (
    <mesh position={position} rotation={[0, rotation, 0]} castShadow receiveShadow>
      <boxGeometry args={[0.12, 0.12, length]} />
      <meshStandardMaterial
        color={color}
        emissive={emissive}
        emissiveIntensity={selected ? 1 : active ? 0.7 : 0.12}
        metalness={0.86}
        roughness={0.24}
      />
    </mesh>
  )
}

function Beacon({ phase, reducedMotion }: Pick<SceneProps, 'phase'> & { reducedMotion: boolean }) {
  const lightRef = useRef<THREE.PointLight>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const isResolved = phase === 'resolved'
  const isWorking = phase === 'analyzing' || phase === 'inspecting'
  const color = isResolved ? '#58d8a2' : isWorking ? '#efb44f' : '#ff684e'

  useFrame(({ clock }) => {
    if (reducedMotion) return
    const pulse = 0.75 + Math.sin(clock.elapsedTime * 3.2) * 0.22
    if (lightRef.current) lightRef.current.intensity = 1.4 + pulse
    if (ringRef.current) {
      ringRef.current.scale.setScalar(0.92 + pulse * 0.16)
      ;(ringRef.current.material as THREE.Material).opacity = 0.5 - pulse * 0.22
    }
  })

  return (
    <group position={[1.32, 0.68, 0.45]}>
      <mesh castShadow>
        <sphereGeometry args={[0.12, 20, 20]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.4} />
      </mesh>
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.28, 0.018, 12, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.28} />
      </mesh>
      <pointLight ref={lightRef} color={color} intensity={1.8} distance={3.5} />
    </group>
  )
}

interface TurnoutProps extends SceneProps {
  reducedMotion: boolean
}

function Turnout({ phase, selectedPart, onSelectPart, reducedMotion }: TurnoutProps) {
  const bladeRef = useRef<THREE.Group>(null)
  const motorRef = useRef<THREE.Group>(null)
  const [hoveredPart, setHoveredPart] = useState<TwinPartId | null>(null)
  const isResolved = phase === 'resolved'
  const isWorking = phase === 'analyzing' || phase === 'inspecting'
  useCursor(hoveredPart !== null, 'pointer', 'auto')

  const selectPart = (part: TwinPartId) => (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    onSelectPart(part)
  }

  const hoverPart = (part: TwinPartId) => (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    setHoveredPart(part)
  }

  const leavePart = (part: TwinPartId) => (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    setHoveredPart((current) => current === part ? null : current)
  }

  useFrame((state, delta) => {
    const target = isResolved ? 0.22 : 0
    if (bladeRef.current) {
      bladeRef.current.position.x = THREE.MathUtils.damp(
        bladeRef.current.position.x,
        target,
        3.5,
        delta,
      )
    }
    if (motorRef.current && isWorking && !reducedMotion) {
      motorRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 10) * 0.008
    }
  })

  return (
    <group rotation={[0, -0.1, 0]}>
      {sleepers.map((z) => (
        <mesh key={z} position={[0, -0.06, z]} receiveShadow castShadow>
          <boxGeometry args={[3.15, 0.13, 0.22]} />
          <meshStandardMaterial color="#322e29" roughness={0.9} />
        </mesh>
      ))}

      <RailSegment position={[-0.72, 0.08, 0]} length={11.1} />
      <RailSegment position={[0.72, 0.08, 0]} length={11.1} />
      <RailSegment position={[1.48, 0.08, -2.38]} rotation={-0.24} length={5.7} />

      <group
        ref={bladeRef}
        onClick={selectPart('switch-blade')}
        onPointerOver={hoverPart('switch-blade')}
        onPointerOut={leavePart('switch-blade')}
      >
        <RailSegment
          position={[0.23, 0.105, -0.9]}
          rotation={-0.105}
          length={4.2}
          active={!isResolved}
          selected={selectedPart === 'switch-blade' || hoveredPart === 'switch-blade'}
        />
        <mesh position={[0.23, 0.12, -0.9]} rotation={[0, -0.105, 0]}>
          <boxGeometry args={[0.48, 0.38, 4.5]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>

      <group
        ref={motorRef}
        position={[1.55, 0.22, 0.45]}
        onClick={selectPart('point-machine')}
        onPointerOver={hoverPart('point-machine')}
        onPointerOut={leavePart('point-machine')}
      >
        <RoundedBox args={[1.35, 0.48, 0.82]} radius={0.08} smoothness={3} castShadow>
          <meshStandardMaterial
            color={selectedPart === 'point-machine' || hoveredPart === 'point-machine' ? '#f4ca68' : '#d7a83e'}
            emissive={selectedPart === 'point-machine' ? '#78540e' : '#140f05'}
            emissiveIntensity={selectedPart === 'point-machine' ? 0.75 : 0.12}
            metalness={0.48}
            roughness={0.48}
          />
        </RoundedBox>
        <mesh position={[0, 0.255, 0]} castShadow>
          <boxGeometry args={[0.86, 0.06, 0.56]} />
          <meshStandardMaterial color="#1b2021" metalness={0.76} roughness={0.32} />
        </mesh>
        <mesh position={[-0.68, -0.08, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.09, 0.09, 1.18, 16]} />
          <meshStandardMaterial color="#a7b2b4" metalness={0.9} roughness={0.2} />
        </mesh>
        <group
          position={[0.53, 0, -0.45]}
          onClick={selectPart('x3-connector')}
          onPointerOver={hoverPart('x3-connector')}
          onPointerOut={leavePart('x3-connector')}
        >
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.12, 0.12, 0.18, 18]} />
            <meshStandardMaterial
              color={isResolved ? '#58d8a2' : '#ff684e'}
              emissive={isResolved ? '#176044' : '#8b2419'}
              emissiveIntensity={selectedPart === 'x3-connector' || hoveredPart === 'x3-connector' ? 1.8 : 0.7}
              metalness={0.42}
              roughness={0.35}
            />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} scale={selectedPart === 'x3-connector' ? 1.35 : 1}>
            <torusGeometry args={[0.2, 0.018, 12, 36]} />
            <meshBasicMaterial
              color={isResolved ? '#58d8a2' : '#ff684e'}
              transparent
              opacity={selectedPart === 'x3-connector' ? 0.95 : 0.38}
            />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.29, 12, 12]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        </group>
      </group>

      <Beacon phase={phase} reducedMotion={reducedMotion} />
    </group>
  )
}

const cameraViews: Record<TwinPartId, { position: THREE.Vector3; target: THREE.Vector3 }> = {
  'point-machine': {
    position: new THREE.Vector3(4.6, 2.6, 4.25),
    target: new THREE.Vector3(1.5, 0.25, 0.35),
  },
  'switch-blade': {
    position: new THREE.Vector3(3.7, 3.5, 4.7),
    target: new THREE.Vector3(0.1, 0.08, -0.8),
  },
  'x3-connector': {
    position: new THREE.Vector3(3.2, 1.65, 2.45),
    target: new THREE.Vector3(2.05, 0.23, 0.02),
  },
}

interface CameraFocusProps {
  selectedPart: TwinPartId | null
  controlsRef: RefObject<ComponentRef<typeof OrbitControls> | null>
}

function CameraFocus({ selectedPart, controlsRef }: CameraFocusProps) {
  const activeRef = useRef(false)

  useEffect(() => {
    activeRef.current = selectedPart !== null
  }, [selectedPart])

  useFrame(({ camera }, delta) => {
    if (!selectedPart || !activeRef.current || !controlsRef.current) return
    const view = cameraViews[selectedPart]
    const controls = controlsRef.current
    const damping = 4.8

    camera.position.x = THREE.MathUtils.damp(camera.position.x, view.position.x, damping, delta)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, view.position.y, damping, delta)
    camera.position.z = THREE.MathUtils.damp(camera.position.z, view.position.z, damping, delta)
    controls.target.x = THREE.MathUtils.damp(controls.target.x, view.target.x, damping, delta)
    controls.target.y = THREE.MathUtils.damp(controls.target.y, view.target.y, damping, delta)
    controls.target.z = THREE.MathUtils.damp(controls.target.z, view.target.z, damping, delta)
    controls.update()

    if (camera.position.distanceTo(view.position) < 0.025 && controls.target.distanceTo(view.target) < 0.025) {
      activeRef.current = false
    }
  })

  return null
}

function SceneContent({ phase, selectedPart, onSelectPart }: SceneProps) {
  const [reducedMotion, setReducedMotion] = useState(false)
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  return (
    <>
      <fog attach="fog" args={['#090d0e', 9, 18]} />
      <ambientLight intensity={0.72} />
      <directionalLight
        castShadow
        color="#e8f2ef"
        intensity={2.1}
        position={[-4, 7, 4]}
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight color="#3cc8bd" intensity={1.4} position={[-3, 2, -3]} distance={8} />
      <Turnout
        phase={phase}
        selectedPart={selectedPart}
        onSelectPart={onSelectPart}
        reducedMotion={reducedMotion}
      />
      <gridHelper args={[22, 44, '#28413f', '#162423']} position={[0, -0.14, 0]} />
      <ContactShadows
        position={[0, -0.13, 0]}
        opacity={0.55}
        scale={13}
        blur={2.4}
        far={5}
      />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enablePan={false}
        minDistance={6.4}
        maxDistance={11}
        minPolarAngle={0.72}
        maxPolarAngle={1.32}
        autoRotate={!reducedMotion && phase === 'idle' && selectedPart === null}
        autoRotateSpeed={0.35}
      />
      <CameraFocus selectedPart={selectedPart} controlsRef={controlsRef} />
    </>
  )
}

export default function PointMachineScene({ phase, selectedPart, onSelectPart }: SceneProps) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ position: [6.8, 5.1, 7.7], fov: 38 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      style={{ position: 'absolute', inset: 0 }}
      aria-label="3D status view of the railway point machine"
      onPointerMissed={() => onSelectPart(null)}
    >
      <SceneContent phase={phase} selectedPart={selectedPart} onSelectPart={onSelectPart} />
    </Canvas>
  )
}
