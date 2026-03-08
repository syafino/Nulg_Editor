import { useEffect, useRef, useCallback, useState } from 'react'
import type { GPUContext } from '@/gpu/context'
import { PathTraceRenderer, type RenderSettings } from '@/gpu/renderer'
import type { SphereData } from '@/gpu/buffers'
import type { SceneSphere } from '@/scene/types'

function sphereToGPU(s: SceneSphere): SphereData {
  return {
    center: s.center,
    radius: s.radius,
    albedo: s.albedo,
    materialType: s.materialType,
    roughnessOrIor: s.roughnessOrIor,
    emissionStrength: s.emissionStrength,
  }
}

export function useRenderer(gpuCtx: GPUContext | null, canvas: HTMLCanvasElement | null) {
  const rendererRef = useRef<PathTraceRenderer | null>(null)
  const [frameCount, setFrameCount] = useState(0)

  useEffect(() => {
    if (!gpuCtx || !canvas) return

    const renderer = new PathTraceRenderer(gpuCtx, canvas)
    rendererRef.current = renderer

    // Resize observer
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        const dpr = Math.min(window.devicePixelRatio, 2)
        const w = Math.floor(width * dpr)
        const h = Math.floor(height * dpr)
        canvas.width = w
        canvas.height = h
        renderer.resize(w, h)
      }
    })
    observer.observe(canvas)

    // Frame count polling for UI updates
    const interval = setInterval(() => {
      setFrameCount(renderer.getFrameCount())
    }, 200)

    renderer.start()

    return () => {
      observer.disconnect()
      clearInterval(interval)
      renderer.destroy()
      rendererRef.current = null
    }
  }, [gpuCtx, canvas])

  const setScene = useCallback((spheres: SceneSphere[]) => {
    rendererRef.current?.setScene(spheres.map(sphereToGPU))
  }, [])

  const setCamera = useCallback(
    (pos: [number, number, number], yaw: number, pitch: number, fov?: number) => {
      rendererRef.current?.setCamera(pos, yaw, pitch, fov)
    },
    [],
  )

  const setSettings = useCallback((settings: Partial<RenderSettings>) => {
    rendererRef.current?.setSettings(settings)
  }, [])

  const resetAccumulation = useCallback(() => {
    rendererRef.current?.resetAccumulation()
  }, [])

  const getCamera = useCallback(() => {
    return rendererRef.current?.getCamera() ?? { pos: [0, 1, 5] as [number, number, number], yaw: Math.PI, pitch: 0, fov: Math.PI / 3 }
  }, [])

  return {
    setScene,
    setCamera,
    setSettings,
    resetAccumulation,
    getCamera,
    frameCount,
  }
}
