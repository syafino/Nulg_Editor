import { useRef, useEffect, useCallback } from 'react'

interface ViewportProps {
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>
  onCameraMove: (dx: number, dy: number) => void
  onCameraPan: (dx: number, dy: number) => void
  onCameraZoom: (delta: number) => void
}

export function Viewport({ canvasRef, onCameraMove, onCameraPan, onCameraZoom }: ViewportProps) {
  const isDragging = useRef(false)
  const isPanning = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button === 0) {
      isDragging.current = true
    } else if (e.button === 1 || e.button === 2) {
      isPanning.current = true
    }
    lastMouse.current = { x: e.clientX, y: e.clientY }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const dx = e.clientX - lastMouse.current.x
      const dy = e.clientY - lastMouse.current.y
      lastMouse.current = { x: e.clientX, y: e.clientY }

      if (isDragging.current) {
        onCameraMove(dx, dy)
      } else if (isPanning.current) {
        onCameraPan(dx, dy)
      }
    },
    [onCameraMove, onCameraPan],
  )

  const handlePointerUp = useCallback(() => {
    isDragging.current = false
    isPanning.current = false
  }, [])

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault()
      onCameraZoom(e.deltaY)
    },
    [onCameraZoom],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.addEventListener('wheel', handleWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', handleWheel)
  }, [canvasRef, handleWheel])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
    />
  )
}
