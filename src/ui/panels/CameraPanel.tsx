interface CameraPanelProps {
  pos: [number, number, number]
  yaw: number
  pitch: number
  fov: number
  onUpdate: (pos: [number, number, number], yaw: number, pitch: number, fov: number) => void
}

export function CameraPanel({ pos, yaw, pitch, fov, onUpdate }: CameraPanelProps) {
  const degYaw = ((yaw * 180) / Math.PI).toFixed(1)
  const degPitch = ((pitch * 180) / Math.PI).toFixed(1)
  const degFov = ((fov * 180) / Math.PI).toFixed(0)

  return (
    <div className="p-2 space-y-2">
      <h2 className="text-sm font-semibold text-zinc-200">Camera</h2>

      <div className="space-y-1.5">
        {(['X', 'Y', 'Z'] as const).map((axis, i) => (
          <label key={axis} className="flex items-center justify-between text-xs">
            <span className="text-zinc-400">{axis}</span>
            <input
              type="number"
              step={0.1}
              value={pos[i]}
              onChange={(e) => {
                const next = [...pos] as [number, number, number]
                next[i] = parseFloat(e.target.value) || 0
                onUpdate(next, yaw, pitch, fov)
              }}
              className="w-20 bg-zinc-800 border border-zinc-600 rounded px-1 py-0.5 text-white"
            />
          </label>
        ))}
      </div>

      <div className="text-xs text-zinc-500 space-y-0.5 pt-1 border-t border-zinc-700">
        <div>Yaw: {degYaw} | Pitch: {degPitch}</div>
        <label className="flex items-center justify-between">
          <span className="text-zinc-400">FOV</span>
          <input
            type="range"
            min={20}
            max={120}
            value={Math.round((fov * 180) / Math.PI)}
            onChange={(e) => {
              const newFov = (parseInt(e.target.value) * Math.PI) / 180
              onUpdate(pos, yaw, pitch, newFov)
            }}
            className="w-24"
          />
          <span className="w-8 text-right text-zinc-200">{degFov}</span>
        </label>
      </div>

      <div className="text-[10px] text-zinc-600 pt-1 border-t border-zinc-700">
        Drag: orbit | Right-drag: pan | Scroll: zoom
      </div>
    </div>
  )
}
