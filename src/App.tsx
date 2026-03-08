import { useRef, useState, useCallback, useEffect } from 'react'
import { useWebGPU } from '@/hooks/useWebGPU'
import { useRenderer } from '@/hooks/useRenderer'
import { Viewport } from '@/ui/Viewport'
import { ScenePanel } from '@/ui/panels/ScenePanel'
import { CameraPanel } from '@/ui/panels/CameraPanel'
import { RenderPanel } from '@/ui/panels/RenderPanel'
import { DEFAULT_SCENE } from '@/scene/defaults'
import type { SceneSphere } from '@/scene/types'
import type { RenderSettings } from '@/gpu/renderer'

export default function App() {
  const { ctx, error } = useWebGPU()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const {
    setScene,
    setCamera,
    setSettings,
    getCamera,
    frameCount,
  } = useRenderer(ctx, canvasRef.current)

  // Scene state
  const [spheres, setSpheres] = useState<SceneSphere[]>(DEFAULT_SCENE.spheres)
  const [cameraState, setCameraState] = useState({
    pos: [0, 1, 5] as [number, number, number],
    yaw: Math.PI,
    pitch: 0,
    fov: Math.PI / 3,
  })
  const [renderSettings, setRenderSettings] = useState<RenderSettings>({
    maxBounces: 6,
    samplesPerPixel: 1,
    skyIntensity: 0.8,
  })

  // Load default scene on mount
  useEffect(() => {
    setScene(spheres)
  }, [ctx]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync scene changes to GPU
  const handleSceneUpdate = useCallback(
    (newSpheres: SceneSphere[]) => {
      setSpheres(newSpheres)
      setScene(newSpheres)
    },
    [setScene],
  )

  // Camera controls
  const handleCameraMove = useCallback(
    (dx: number, dy: number) => {
      setCameraState((prev) => {
        const sensitivity = 0.003
        const newYaw = prev.yaw + dx * sensitivity
        const newPitch = Math.max(
          -Math.PI / 2 + 0.01,
          Math.min(Math.PI / 2 - 0.01, prev.pitch + dy * sensitivity),
        )
        setCamera(prev.pos, newYaw, newPitch, prev.fov)
        return { ...prev, yaw: newYaw, pitch: newPitch }
      })
    },
    [setCamera],
  )

  const handleCameraPan = useCallback(
    (dx: number, dy: number) => {
      setCameraState((prev) => {
        const cam = getCamera()
        const speed = 0.005
        const forward = [
          Math.sin(cam.yaw) * Math.cos(cam.pitch),
          Math.sin(cam.pitch),
          Math.cos(cam.yaw) * Math.cos(cam.pitch),
        ]
        const right = [
          forward[1] * 0 - forward[2] * 1,
          forward[2] * 0 - forward[0] * 0,
          forward[0] * 1 - forward[1] * 0,
        ]
        const rLen = Math.sqrt(right[0] ** 2 + right[1] ** 2 + right[2] ** 2)
        if (rLen > 0) {
          right[0] /= rLen; right[1] /= rLen; right[2] /= rLen
        }
        const up = [
          right[1] * forward[2] - right[2] * forward[1],
          right[2] * forward[0] - right[0] * forward[2],
          right[0] * forward[1] - right[1] * forward[0],
        ]

        const newPos: [number, number, number] = [
          prev.pos[0] - dx * speed * right[0] + dy * speed * up[0],
          prev.pos[1] - dx * speed * right[1] + dy * speed * up[1],
          prev.pos[2] - dx * speed * right[2] + dy * speed * up[2],
        ]
        setCamera(newPos, prev.yaw, prev.pitch, prev.fov)
        return { ...prev, pos: newPos }
      })
    },
    [setCamera, getCamera],
  )

  const handleCameraZoom = useCallback(
    (delta: number) => {
      setCameraState((prev) => {
        const speed = 0.01
        const forward = [
          Math.sin(prev.yaw) * Math.cos(prev.pitch),
          Math.sin(prev.pitch),
          Math.cos(prev.yaw) * Math.cos(prev.pitch),
        ]
        const newPos: [number, number, number] = [
          prev.pos[0] - forward[0] * delta * speed,
          prev.pos[1] - forward[1] * delta * speed,
          prev.pos[2] - forward[2] * delta * speed,
        ]
        setCamera(newPos, prev.yaw, prev.pitch, prev.fov)
        return { ...prev, pos: newPos }
      })
    },
    [setCamera],
  )

  const handleCameraUpdate = useCallback(
    (pos: [number, number, number], yaw: number, pitch: number, fov: number) => {
      setCameraState({ pos, yaw, pitch, fov })
      setCamera(pos, yaw, pitch, fov)
    },
    [setCamera],
  )

  const handleSettingsUpdate = useCallback(
    (patch: Partial<RenderSettings>) => {
      setRenderSettings((prev) => {
        const next = { ...prev, ...patch }
        setSettings(next)
        return next
      })
    },
    [setSettings],
  )

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-900 text-red-400 text-center p-8">
        <div>
          <h1 className="text-xl font-bold mb-2">WebGPU Not Available</h1>
          <p className="text-sm text-zinc-400">{error}</p>
        </div>
      </div>
    )
  }

  // Loading state
  if (!ctx) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-900 text-zinc-400">
        Initializing WebGPU...
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-zinc-900 text-white overflow-hidden">
      {/* Left sidebar */}
      <div className="w-64 flex-shrink-0 border-r border-zinc-700 flex flex-col bg-zinc-900">
        <div className="p-2 border-b border-zinc-700">
          <h1 className="text-sm font-bold tracking-wide text-zinc-100">WebRay Editor</h1>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ScenePanel spheres={spheres} onUpdate={handleSceneUpdate} />
        </div>
      </div>

      {/* Viewport */}
      <div className="flex-1 relative">
        <Viewport
          canvasRef={canvasRef}
          onCameraMove={handleCameraMove}
          onCameraPan={handleCameraPan}
          onCameraZoom={handleCameraZoom}
        />
        {/* Frame counter overlay */}
        <div className="absolute top-2 left-2 text-[10px] text-zinc-500 font-mono bg-zinc-900/70 px-1.5 py-0.5 rounded">
          {frameCount} frames
        </div>
      </div>

      {/* Right sidebar */}
      <div className="w-56 flex-shrink-0 border-l border-zinc-700 bg-zinc-900 overflow-y-auto">
        <CameraPanel
          pos={cameraState.pos}
          yaw={cameraState.yaw}
          pitch={cameraState.pitch}
          fov={cameraState.fov}
          onUpdate={handleCameraUpdate}
        />
        <div className="border-t border-zinc-700" />
        <RenderPanel
          settings={renderSettings}
          onUpdate={handleSettingsUpdate}
          frameCount={frameCount}
        />
      </div>
    </div>
  )
}
