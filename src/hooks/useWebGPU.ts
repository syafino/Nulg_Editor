import { useEffect, useState } from 'react'
import { initWebGPU, type GPUContext } from '@/gpu/context'

export function useWebGPU() {
  const [ctx, setCtx] = useState<GPUContext | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    initWebGPU()
      .then((gpuCtx) => {
        if (!cancelled) setCtx(gpuCtx)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { ctx, error }
}
