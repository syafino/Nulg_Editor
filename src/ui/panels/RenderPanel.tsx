import type { RenderSettings } from '@/gpu/renderer'

interface RenderPanelProps {
  settings: RenderSettings
  onUpdate: (settings: Partial<RenderSettings>) => void
  frameCount: number
}

export function RenderPanel({ settings, onUpdate, frameCount }: RenderPanelProps) {
  return (
    <div className="p-2 space-y-3">
      <h2 className="text-sm font-semibold text-zinc-200">Render</h2>

      <div className="space-y-2">
        <label className="flex items-center justify-between text-xs">
          <span className="text-zinc-400">Bounces</span>
          <input
            type="range"
            min={1}
            max={16}
            value={settings.maxBounces}
            onChange={(e) => onUpdate({ maxBounces: parseInt(e.target.value) })}
            className="w-24"
          />
          <span className="w-6 text-right text-zinc-200">{settings.maxBounces}</span>
        </label>

        <label className="flex items-center justify-between text-xs">
          <span className="text-zinc-400">SPP</span>
          <input
            type="range"
            min={1}
            max={8}
            value={settings.samplesPerPixel}
            onChange={(e) => onUpdate({ samplesPerPixel: parseInt(e.target.value) })}
            className="w-24"
          />
          <span className="w-6 text-right text-zinc-200">{settings.samplesPerPixel}</span>
        </label>

        <label className="flex items-center justify-between text-xs">
          <span className="text-zinc-400">Sky</span>
          <input
            type="range"
            min={0}
            max={3}
            step={0.1}
            value={settings.skyIntensity}
            onChange={(e) => onUpdate({ skyIntensity: parseFloat(e.target.value) })}
            className="w-24"
          />
          <span className="w-6 text-right text-zinc-200">{settings.skyIntensity.toFixed(1)}</span>
        </label>
      </div>

      <div className="text-xs text-zinc-500 pt-1 border-t border-zinc-700">
        Accumulated frames: {frameCount}
      </div>
    </div>
  )
}
